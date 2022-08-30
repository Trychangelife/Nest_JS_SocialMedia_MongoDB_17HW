import { Injectable, Next } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Aggregate, Model } from "mongoose"
import { LikesDTO } from "src/comments/comments.controller"
import { BloggersType, CommentsType, LIKES, Post, PostsType, UsersType } from "src/types/types"

export const postViewModel = {
    _id: 0,
    id: 1,
    title: 1,
    shortDescription: 1,
    content: 1,
    bloggerId: 1,
    bloggerName: 1,
    addedAt: 1,
    extendedLikesInfo: 1,
}

export const commentsVievModel = {
    _id: 0,
    postId: 0,
    __v: 0
}

@Injectable()
export class PostRepository {

    constructor (
    @InjectModel('Posts') protected postsModel: Model<PostsType>, 
    @InjectModel('Blogger') protected bloggerModel: Model<BloggersType>, 
    @InjectModel('Comments') protected commentsModel: Model<CommentsType>,
    @InjectModel('Users') protected usersModel: Model<UsersType>) {

    }
async allPosts(skip: number, limit: number, page?: number): Promise<object> {
    const totalCount = await this.postsModel.count({})
    const pagesCount = Math.ceil(totalCount / limit)
    const cursor = await this.postsModel.find({}, postViewModel).skip(skip).limit(limit)

    const targetPostWithAggregation = await this.postsModel.aggregate([{
        $project: {_id: 0 ,id: 1, title: 1, shortDescription: 1, content: 1, bloggerId: 1, bloggerName: 1, addedAt: 1, extendedLikesInfo: {likesCount: 1, dislikesCount: 1, myStatus: 1, newestLikes: {addedAt: 1, userId: 1, login: 1}}}}
    ])
    return { pagesCount: pagesCount, page: page, pageSize: limit, totalCount: totalCount, items: targetPostWithAggregation }
}
async targetPosts(postId: string, userId?: string): Promise<object | undefined> {
    const targetPost: PostsType | null = await this.postsModel.findOne({ id: postId }, postViewModel)
    const checkOnDislike = (await this.postsModel.findOne({$and: [{id: postId}, {"dislikeStorage.userId": userId}]}).lean())
    const checkOnLike = (await this.postsModel.findOne({$and: [{id: postId}, {"extendedLikesInfo.newestLikes.userId": userId}]}).lean())
    let myStatus = ''
    if (checkOnLike) {
        myStatus = "Like"
    }
    else if (checkOnDislike) {
        myStatus = "Dislike"
    }
    else {
        myStatus = "None"
    }
    
    const targetPostWithAggregation = await this.postsModel.aggregate([{
        $project: {_id: 0 ,id: 1, title: 1, shortDescription: 1, content: 1, bloggerId: 1, bloggerName: 1, addedAt: 1, extendedLikesInfo: {likesCount: 1, dislikesCount: 1, myStatus: myStatus, newestLikes: {addedAt: 1, userId: 1, login: 1}}}
    }
    ]).match({id: postId})
    if (targetPostWithAggregation == null) {
        return undefined
    }
    else {
        return {...targetPostWithAggregation[0], extendedLikesInfo: {...targetPostWithAggregation[0].extendedLikesInfo, newestLikes: targetPostWithAggregation[0].extendedLikesInfo.newestLikes.slice(0,3)
            //.sort((a,b) => a.addedAt.getTime() - b.addedAt.getTime())
        }}; 
        try {
           
        } finally {
            return targetPostWithAggregation[0]
        }
        
    }
}
async allPostsSpecificBlogger(bloggerId: string, skip: number, pageSize?: number, page?: number): Promise<object | undefined> {


    const totalCount = await this.postsModel.count({ bloggerId: bloggerId })
    const checkBloggerExist = await this.bloggerModel.count({ id: bloggerId })
    if (checkBloggerExist < 1) { return undefined }
    if (page !== undefined && pageSize !== undefined) {
        const postsBloggerWithPaginator = await this.postsModel.find({ bloggerId: bloggerId }, postViewModel).skip(skip).limit(pageSize).lean()
        const pagesCount = Math.ceil(totalCount / pageSize)
        if (page > 0 || pageSize > 0) {
            return { pagesCount, page: page, pageSize: pageSize, totalCount, items: postsBloggerWithPaginator }
        }
        else {
            const postsBloggerWithOutPaginator = await this.postsModel.find({ bloggerId: bloggerId }).lean()
            return { pagesCount: 0, page: page, pageSize: pageSize, totalCount, items: postsBloggerWithOutPaginator }
        }

    }
}
async releasePost(newPosts: PostsType, bloggerId: string, bloggerIdUrl?: string): Promise<object | string> {
    const findBlogger = await this.bloggerModel.count({ id: bloggerId })
    if (findBlogger < 1) { return "400" }
    await this.postsModel.create(newPosts)
    const result: PostsType | null = await this.postsModel.findOne({ id: newPosts.id }, postViewModel).lean()
    if (result !== null) { return result }
    else { return "400" }
}
async changePost(postId: string, title: string, shortDescription: string, content: string, bloggerId: string): Promise<string | object> {

    const foundPost = await this.postsModel.findOne({ id: postId }, postViewModel).lean()
    const foundBlogger = await this.bloggerModel.findOne({ id: bloggerId }).lean()
    if (foundPost !== null && foundBlogger !== null) {
        await this.postsModel.updateOne({ id: postId }, { $set: { title: title, shortDescription: shortDescription, content: content, } })
        return foundPost
    }
    else if (foundBlogger == null) {
        return '400'
    }
    else {
        return "404"
    }
}
async deletePost(deleteId: string): Promise<boolean> {
    const result = await this.postsModel.deleteOne({ id: deleteId })
    return result.deletedCount === 1
}
async createCommentForSpecificPost(createdComment: CommentsType): Promise<CommentsType | boolean> {

    await this.commentsModel.create(createdComment)
    const foundNewPost: CommentsType = await this.commentsModel.findOne({commentId: createdComment.id}, commentsVievModel).lean()
    if (foundNewPost !== null) {
    return foundNewPost}
    else {return false}
}
async takeCommentByIdPost (postId: string, skip: number, limit: number, page: number): Promise<object | boolean> {
    const findPosts = await this.postsModel.findOne({id: postId}).lean()
    const totalCount = await this.commentsModel.count({postId: postId})
    const pagesCount = Math.ceil(totalCount / limit)
    if (findPosts !== null) {
    const findComments = await this.commentsModel.find({postId: postId}, commentsVievModel).skip(skip).limit(limit).lean()
    return { pagesCount: pagesCount, page: page, pageSize: limit, totalCount: totalCount, items: findComments }}
    else { return false}
}

async like_dislike(postId: string, likeStatus: LikesDTO, userId: string, login: string): Promise<string | object> {
    const foundPost = await this.postsModel.findOne({ id: postId }, postViewModel).lean()
    const foundUser = await this.usersModel.findOne({ id: userId }).lean()
    try {
        const likesCountPlusLike = foundPost.extendedLikesInfo.likesCount + 1
        const likesCountMinusLike = foundPost.extendedLikesInfo.likesCount - 1
        const dislikesCountPlusLike = foundPost.extendedLikesInfo.dislikesCount + 1
        const dislikesCountMinusDislike = foundPost.extendedLikesInfo.dislikesCount - 1
    
    
    const keys = Object.keys(likeStatus)

    // WHEN WE HAVE LIKE
    if (foundPost !== null && foundUser !== null && (likeStatus[keys[0]]) === "Like") {
        const checkOnLike = await this.postsModel.find({$and: [{"extendedLikesInfo.newestLikes.userId": userId}, {id: postId}] } ).lean()
        const howMuchLikes = await this.postsModel.find({"extendedLikesInfo.newestLikes": []}).count()
        const checkOnDislike = await this.postsModel.find({$and: [{"dislikeStorage.userId": userId}, {id: postId}] } ).lean()
        console.log(checkOnLike)
        if (checkOnDislike.length > 0) {
            // Проверяем, вдруг уже есть дизлайк, нужно его убрать (одновременно два статуса быть не может)
            await this.postsModel.updateOne({ id: postId }, { $set: {"extendedLikesInfo.dislikesCount": dislikesCountMinusDislike } })
            await this.postsModel.updateOne({id: postId}, {$pull: {dislikeStorage: {userId}}})
        }
        if (checkOnLike.length > 0) {
            // Лайк уже стоит, значит убираем из всех storage упоминания о этом лайке
            await this.postsModel.updateOne({ id: postId }, { $set: {"extendedLikesInfo.likesCount": likesCountMinusLike } })
            await this.postsModel.updateOne({id: postId}, {$pull: {"extendedLikesInfo.newestLikes": {userId}}})
            await this.postsModel.updateOne({id: postId}, {$pull: {likeStorage: {userId}}})
            return foundPost
        }
        else {
            // Лайка нет, добавляем информацию о оставленном лайке в storage 
            await this.postsModel.updateOne({ id: postId }, { $set: {"extendedLikesInfo.likesCount": likesCountPlusLike } })
            await this.postsModel.findOneAndUpdate({id: postId}, {$push: {"extendedLikesInfo.newestLikes": {addedAt: new Date(), userId: userId, login: login}}})
            await this.postsModel.findOneAndUpdate({id: postId}, {$push: {likeStorage: {addedAt: new Date(), userId: userId, login: login}}})
            return foundPost
        }
    }
    // WHEN WE HAVE DISLIKE
    else if (foundPost !== null && foundUser !== null && (likeStatus[keys[0]]) === "Dislike") {
        const checkOnDislike = await this.postsModel.find({$and: [{"dislikeStorage.userId": userId}, {id: postId}] } ).lean()
        const checkOnLike = await this.postsModel.find({$and: [{"extendedLikesInfo.newestLikes.userId": userId}, {id: postId}] } ).lean()
        if (checkOnLike.length > 0) {
            // Проверяем, вдруг уже есть лайк, нужно его убрать (одновременно два статуса быть не может)
            await this.postsModel.updateOne({ id: postId }, { $set: {"extendedLikesInfo.likesCount": likesCountMinusLike } })
            await this.postsModel.updateOne({id: postId}, {$pull: {"extendedLikesInfo.newestLikes": {userId}}})
            await this.postsModel.updateOne({id: postId}, {$pull: {likeStorage: {userId}}})
        }
        if (checkOnDislike.length > 0) {
            // Дизлайк уже стоит, значит убираем из всех storage упоминания о этом Дизлайке
        await this.postsModel.updateOne({ id: postId }, { $set: {"extendedLikesInfo.dislikesCount": dislikesCountMinusDislike } })
        await this.postsModel.updateOne({id: postId}, {$pull: {dislikeStorage: {userId}}})
        return foundPost
        }
        else {
            // Дизлайка нет, добавляем информацию о оставленном Дизлайке в storage 
            await this.postsModel.updateOne({ id: postId }, { $set: {"extendedLikesInfo.dislikesCount": dislikesCountPlusLike } })
            await this.postsModel.findOneAndUpdate({id: postId}, {$push: {dislikeStorage: {addedAt: new Date(), userId: userId, login: login}}})
            return foundPost
    }
    } 
    // WHEN WE HAVE NONE
    else if (foundPost !== null && foundUser !== null && (likeStatus[keys[0]]) === "None") {
        const checkOnDislike = await this.postsModel.find({$and: [{"dislikeStorage.userId": userId}, {id: postId}] } ).lean()
        const checkOnLike = await this.postsModel.find({$and: [{"likeStorage.userId": userId}, {id: postId}] } ).lean()

        // Проверяем наличие лайков/дизлайков, если что-то есть, убираем, так как статус NONE
        if (checkOnLike.length > 0) {
            await this.postsModel.updateOne({id: postId }, { $set: {"extendedLikesInfo.likesCount": likesCountMinusLike } })
            await this.postsModel.updateOne({id: postId}, {$pull: {"extendedLikesInfo.newestLikes": {userId}}})
            await this.postsModel.updateOne({id: postId}, {$pull: {likeStorage: {userId}}})
            return foundPost
        }
       else if (checkOnDislike.length > 0) {
            await this.postsModel.updateOne({ id: postId }, { $set: {"extendedLikesInfo.dislikesCount": dislikesCountMinusDislike } })
            await this.postsModel.updateOne({id: postId}, {$pull: {dislikeStorage: {userId}}})
            return foundPost
       }
       
    }
    else if (foundUser == null) {
        return '400'
    }
    else {
        return "404"
    }
    } catch (error) {
    return "404"
}
}
}