import mongoose from 'mongoose';

const { Schema } = mongoose;

const blogPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    body: { type: String, required: true },
    heroImage: { type: String, default: '', trim: true },
    heroImagePublicId: { type: String, default: '', trim: true },
    badge: { type: String, default: '', trim: true },
    tags: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    sourceType: { type: String, enum: ['manual', 'ingested', 'filesystem'], default: 'manual' },
    sourceName: { type: String, default: '', trim: true },
    sourceUrl: { type: String, default: '', trim: true },
    sourceCanonicalUrl: { type: String, default: '', trim: true },
    sourcePublishedAt: { type: Date },
    pubDate: { type: Date },
    updatedDate: { type: Date },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'auth-user' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'auth-user' },
    reviewNotes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

blogPostSchema.index({ status: 1, pubDate: -1 });
blogPostSchema.index({ sourceCanonicalUrl: 1 }, { sparse: true });
blogPostSchema.index({ sourceUrl: 1 }, { sparse: true });

const mikDB = mongoose.connection.useDb('mikeka-ya-uhakika');
const BlogPost = mikDB.model('blog-post', blogPostSchema);

export default BlogPost;
