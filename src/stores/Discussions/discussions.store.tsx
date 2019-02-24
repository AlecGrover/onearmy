import { observable, action } from 'mobx'
import {
  IDiscussionComment,
  IDiscussionPost,
  IPostFormInput,
} from 'src/models/discussions.models'
import { Database } from '../database'
import helpers from 'src/utils/helpers'
import { ModuleStore } from '../common/module.store'
import { Subscription } from 'rxjs'

export class DiscussionsStore extends ModuleStore {
  private allDiscussionComments$ = new Subscription()
  @observable
  public activeDiscussion: IDiscussionPost | undefined
  @observable
  public allDiscussionComments: IDiscussionComment[] = []
  @observable
  public allDiscussions: IDiscussionPost[]

  // when initiating, discussions will be fetched via common method in module.store.ts
  // keep results of allDocs and activeDoc in sync with local varialbes
  constructor() {
    super('discussions')
    this.allDocs$.subscribe(docs => (this.allDiscussions = docs))
    this.activeDoc$.subscribe(doc => (this.activeDiscussion = doc))
    this._addCommentsSubscription()
  }
  componentDidMount() {}

  @action
  public async setActiveDiscussion(slug: string) {
    this.setActiveDoc('slug', slug)
  }

  @action
  public async createDiscussion(values: IPostFormInput) {
    console.log('adding discussion', values)
    const discussion: IDiscussionPost = {
      ...Database.generateDocMeta('discussions'),
      _commentCount: 0,
      _last3Comments: [],
      _lastResponse: null,
      _usefullCount: 0,
      _viewCount: 0,
      content: values.content,
      createdBy: Database.getUser() as string,
      isClosed: false,
      slug: helpers.stripSpecialCharacters(values.title),
      tags: values.tags,
      title: values.title,
      type: 'discussionQuestion',
    }
    await Database.checkSlugUnique('discussions', discussion.slug)
    await this.saveDiscussion(discussion)
    // after creation want to return so slug or id can be used for navigation etc.
    return discussion
  }

  @action
  public createComment(
    discussionID: string,
    comment: string,
    repliesToId?: string,
  ) {
    const values: IDiscussionComment = {
      ...Database.generateDocMeta(`discussions/${discussionID}/comments`),
      comment,
      _discussionID: discussionID,
      replies: [],
      repliesTo: repliesToId ? repliesToId : discussionID,
      type: 'discussionComment',
    }
    return Database.setDoc(
      `discussions/${discussionID}/comments/${values._id}`,
      values,
    )
  }

  @action
  public async deleteDiscussion(discussion: IDiscussionPost) {
    return Database.deleteDoc(`discussions/${discussion._id}`)
  }

  public async saveDiscussion(discussion: IDiscussionPost) {
    return Database.setDoc(`discussions/${discussion._id}`, discussion)
  }

  // want to add an additional listener so that when the active discussion changes
  // any comments are also loaded from subcollection
  private _addCommentsSubscription() {
    this.allDiscussionComments$.unsubscribe()
    this.activeDoc$.subscribe(doc => {
      if (doc) {
        this.allDiscussionComments$ = Database.getCollection(
          `discussions/${doc._id}/comments`,
        ).subscribe(docs => {
          console.log('comments', docs)
          this.allDiscussionComments = docs
        })
      }
    })
  }
}