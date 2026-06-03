import mongoose from 'mongoose';

const { Schema } = mongoose;

const newsIngestSchema = new Schema(
  {
    source: { type: String, required: true, trim: true, index: true },
    sourceUrl: { type: String, required: true, trim: true, unique: true },
    canonicalUrl: { type: String, required: true, trim: true, unique: true },
    sourceTitle: { type: String, default: '', trim: true },
    sourcePublishedAt: { type: Date },
    sourceHash: { type: String, default: '', trim: true, index: true },
    status: {
      type: String,
      enum: ['discovered', 'fetched', 'rewritten', 'image_uploaded', 'drafted', 'skipped', 'failed'],
      default: 'discovered',
      index: true,
    },
    blogPostId: { type: Schema.Types.ObjectId, ref: 'blog-post' },
    outputSlug: { type: String, default: '', trim: true },
    cloudinaryPublicId: { type: String, default: '', trim: true },
    errorMessage: { type: String, default: '', trim: true },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
  },
  { timestamps: true }
);

newsIngestSchema.index({ source: 1, status: 1, createdAt: -1 });

const mikDB = mongoose.connection.useDb('mikeka-ya-uhakika');
const NewsIngest = mikDB.model('news-ingest', newsIngestSchema);

export default NewsIngest;
