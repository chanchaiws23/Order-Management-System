export interface ReviewProps {
  id: string;
  productId: string;
  customerId?: string;
  orderId?: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewProps {
  id: string;
  productId: string;
  customerId?: string;
  orderId?: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
  isVerifiedPurchase?: boolean;
}

export class Review {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _customerId?: string;
  private readonly _orderId?: string;
  private _rating: number;
  private _title?: string;
  private _content?: string;
  private _images?: string[];
  private _isVerifiedPurchase: boolean;
  private _isApproved: boolean;
  private _helpfulCount: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ReviewProps) {
    this._id = props.id;
    this._productId = props.productId;
    this._customerId = props.customerId;
    this._orderId = props.orderId;
    this._rating = props.rating;
    this._title = props.title;
    this._content = props.content;
    this._images = props.images;
    this._isVerifiedPurchase = props.isVerifiedPurchase;
    this._isApproved = props.isApproved;
    this._helpfulCount = props.helpfulCount;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateReviewProps): Review {
    if (props.rating < 1 || props.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const now = new Date();
    return new Review({
      ...props,
      isVerifiedPurchase: props.isVerifiedPurchase ?? false,
      isApproved: false,
      helpfulCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ReviewProps): Review {
    return new Review(props);
  }

  get id(): string { return this._id; }
  get productId(): string { return this._productId; }
  get customerId(): string | undefined { return this._customerId; }
  get orderId(): string | undefined { return this._orderId; }
  get rating(): number { return this._rating; }
  get title(): string | undefined { return this._title; }
  get content(): string | undefined { return this._content; }
  get images(): string[] | undefined { return this._images; }
  get isVerifiedPurchase(): boolean { return this._isVerifiedPurchase; }
  get isApproved(): boolean { return this._isApproved; }
  get helpfulCount(): number { return this._helpfulCount; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  update(data: { rating?: number; title?: string; content?: string; images?: string[] }): void {
    if (data.rating !== undefined) {
      if (data.rating < 1 || data.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      this._rating = data.rating;
    }
    if (data.title !== undefined) this._title = data.title;
    if (data.content !== undefined) this._content = data.content;
    if (data.images !== undefined) this._images = data.images;
    this._isApproved = false;
    this.touch();
  }

  approve(): void {
    this._isApproved = true;
    this.touch();
  }

  reject(): void {
    this._isApproved = false;
    this.touch();
  }

  markAsVerifiedPurchase(): void {
    this._isVerifiedPurchase = true;
    this.touch();
  }

  incrementHelpful(): void {
    this._helpfulCount++;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toObject(): ReviewProps {
    return {
      id: this._id,
      productId: this._productId,
      customerId: this._customerId,
      orderId: this._orderId,
      rating: this._rating,
      title: this._title,
      content: this._content,
      images: this._images,
      isVerifiedPurchase: this._isVerifiedPurchase,
      isApproved: this._isApproved,
      helpfulCount: this._helpfulCount,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
