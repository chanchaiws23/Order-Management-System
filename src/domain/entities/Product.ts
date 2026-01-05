export interface ProductProps {
  id: string;
  categoryId?: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency: string;
  stockQuantity: number;
  lowStockThreshold: number;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  imageUrl?: string;
  galleryUrls?: string[];
  tags?: string[];
  attributes?: Record<string, string>;
  isActive: boolean;
  isFeatured: boolean;
  isDigital: boolean;
  taxClass: string;
  metaTitle?: string;
  metaDescription?: string;
  viewCount: number;
  soldCount: number;
  ratingAverage: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductProps {
  id: string;
  categoryId?: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  imageUrl?: string;
  galleryUrls?: string[];
  tags?: string[];
  attributes?: Record<string, string>;
  isDigital?: boolean;
  taxClass?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export class Product {
  private readonly _id: string;
  private _categoryId?: string;
  private _sku: string;
  private _name: string;
  private _slug: string;
  private _description?: string;
  private _shortDescription?: string;
  private _price: number;
  private _compareAtPrice?: number;
  private _costPrice?: number;
  private _currency: string;
  private _stockQuantity: number;
  private _lowStockThreshold: number;
  private _weight?: number;
  private _width?: number;
  private _height?: number;
  private _length?: number;
  private _imageUrl?: string;
  private _galleryUrls?: string[];
  private _tags?: string[];
  private _attributes?: Record<string, string>;
  private _isActive: boolean;
  private _isFeatured: boolean;
  private _isDigital: boolean;
  private _taxClass: string;
  private _metaTitle?: string;
  private _metaDescription?: string;
  private _viewCount: number;
  private _soldCount: number;
  private _ratingAverage: number;
  private _ratingCount: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ProductProps) {
    this._id = props.id;
    this._categoryId = props.categoryId;
    this._sku = props.sku;
    this._name = props.name;
    this._slug = props.slug;
    this._description = props.description;
    this._shortDescription = props.shortDescription;
    this._price = props.price;
    this._compareAtPrice = props.compareAtPrice;
    this._costPrice = props.costPrice;
    this._currency = props.currency;
    this._stockQuantity = props.stockQuantity;
    this._lowStockThreshold = props.lowStockThreshold;
    this._weight = props.weight;
    this._width = props.width;
    this._height = props.height;
    this._length = props.length;
    this._imageUrl = props.imageUrl;
    this._galleryUrls = props.galleryUrls;
    this._tags = props.tags;
    this._attributes = props.attributes;
    this._isActive = props.isActive;
    this._isFeatured = props.isFeatured;
    this._isDigital = props.isDigital;
    this._taxClass = props.taxClass;
    this._metaTitle = props.metaTitle;
    this._metaDescription = props.metaDescription;
    this._viewCount = props.viewCount;
    this._soldCount = props.soldCount;
    this._ratingAverage = props.ratingAverage;
    this._ratingCount = props.ratingCount;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateProductProps): Product {
    if (!props.sku || props.sku.trim() === '') {
      throw new Error('SKU is required');
    }
    if (!props.name || props.name.trim() === '') {
      throw new Error('Product name is required');
    }
    if (props.price < 0) {
      throw new Error('Price cannot be negative');
    }

    const now = new Date();
    return new Product({
      ...props,
      currency: props.currency ?? 'THB',
      stockQuantity: props.stockQuantity ?? 0,
      lowStockThreshold: props.lowStockThreshold ?? 10,
      isActive: true,
      isFeatured: false,
      isDigital: props.isDigital ?? false,
      taxClass: props.taxClass ?? 'standard',
      viewCount: 0,
      soldCount: 0,
      ratingAverage: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props);
  }

  get id(): string { return this._id; }
  get categoryId(): string | undefined { return this._categoryId; }
  get sku(): string { return this._sku; }
  get name(): string { return this._name; }
  get slug(): string { return this._slug; }
  get description(): string | undefined { return this._description; }
  get shortDescription(): string | undefined { return this._shortDescription; }
  get price(): number { return this._price; }
  get compareAtPrice(): number | undefined { return this._compareAtPrice; }
  get costPrice(): number | undefined { return this._costPrice; }
  get currency(): string { return this._currency; }
  get stockQuantity(): number { return this._stockQuantity; }
  get lowStockThreshold(): number { return this._lowStockThreshold; }
  get weight(): number | undefined { return this._weight; }
  get width(): number | undefined { return this._width; }
  get height(): number | undefined { return this._height; }
  get length(): number | undefined { return this._length; }
  get imageUrl(): string | undefined { return this._imageUrl; }
  get galleryUrls(): string[] | undefined { return this._galleryUrls; }
  get tags(): string[] | undefined { return this._tags; }
  get attributes(): Record<string, string> | undefined { return this._attributes; }
  get isActive(): boolean { return this._isActive; }
  get isFeatured(): boolean { return this._isFeatured; }
  get isDigital(): boolean { return this._isDigital; }
  get taxClass(): string { return this._taxClass; }
  get metaTitle(): string | undefined { return this._metaTitle; }
  get metaDescription(): string | undefined { return this._metaDescription; }
  get viewCount(): number { return this._viewCount; }
  get soldCount(): number { return this._soldCount; }
  get ratingAverage(): number { return this._ratingAverage; }
  get ratingCount(): number { return this._ratingCount; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  get isInStock(): boolean { return this._stockQuantity > 0; }
  get isLowStock(): boolean { return this._stockQuantity <= this._lowStockThreshold; }
  get discountPercent(): number {
    if (!this._compareAtPrice || this._compareAtPrice <= this._price) return 0;
    return Math.round(((this._compareAtPrice - this._price) / this._compareAtPrice) * 100);
  }
  get profit(): number {
    if (!this._costPrice) return 0;
    return this._price - this._costPrice;
  }

  updateDetails(data: Partial<CreateProductProps>): void {
    if (data.categoryId !== undefined) this._categoryId = data.categoryId;
    if (data.sku !== undefined) this._sku = data.sku;
    if (data.name !== undefined) this._name = data.name;
    if (data.slug !== undefined) this._slug = data.slug;
    if (data.description !== undefined) this._description = data.description;
    if (data.shortDescription !== undefined) this._shortDescription = data.shortDescription;
    if (data.price !== undefined) this._price = data.price;
    if (data.compareAtPrice !== undefined) this._compareAtPrice = data.compareAtPrice;
    if (data.costPrice !== undefined) this._costPrice = data.costPrice;
    if (data.weight !== undefined) this._weight = data.weight;
    if (data.width !== undefined) this._width = data.width;
    if (data.height !== undefined) this._height = data.height;
    if (data.length !== undefined) this._length = data.length;
    if (data.imageUrl !== undefined) this._imageUrl = data.imageUrl;
    if (data.galleryUrls !== undefined) this._galleryUrls = data.galleryUrls;
    if (data.tags !== undefined) this._tags = data.tags;
    if (data.attributes !== undefined) this._attributes = data.attributes;
    if (data.metaTitle !== undefined) this._metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) this._metaDescription = data.metaDescription;
    this.touch();
  }

  adjustStock(quantity: number): void {
    const newStock = this._stockQuantity + quantity;
    if (newStock < 0) {
      throw new Error('Stock cannot be negative');
    }
    this._stockQuantity = newStock;
    this.touch();
  }

  incrementViewCount(): void {
    this._viewCount++;
  }

  recordSale(quantity: number): void {
    this._soldCount += quantity;
    this.touch();
  }

  updateRating(newRating: number): void {
    const totalRating = this._ratingAverage * this._ratingCount + newRating;
    this._ratingCount++;
    this._ratingAverage = Math.round((totalRating / this._ratingCount) * 100) / 100;
    this.touch();
  }

  activate(): void { this._isActive = true; this.touch(); }
  deactivate(): void { this._isActive = false; this.touch(); }
  setFeatured(): void { this._isFeatured = true; this.touch(); }
  unsetFeatured(): void { this._isFeatured = false; this.touch(); }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toObject(): ProductProps {
    return {
      id: this._id,
      categoryId: this._categoryId,
      sku: this._sku,
      name: this._name,
      slug: this._slug,
      description: this._description,
      shortDescription: this._shortDescription,
      price: this._price,
      compareAtPrice: this._compareAtPrice,
      costPrice: this._costPrice,
      currency: this._currency,
      stockQuantity: this._stockQuantity,
      lowStockThreshold: this._lowStockThreshold,
      weight: this._weight,
      width: this._width,
      height: this._height,
      length: this._length,
      imageUrl: this._imageUrl,
      galleryUrls: this._galleryUrls,
      tags: this._tags,
      attributes: this._attributes,
      isActive: this._isActive,
      isFeatured: this._isFeatured,
      isDigital: this._isDigital,
      taxClass: this._taxClass,
      metaTitle: this._metaTitle,
      metaDescription: this._metaDescription,
      viewCount: this._viewCount,
      soldCount: this._soldCount,
      ratingAverage: this._ratingAverage,
      ratingCount: this._ratingCount,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
