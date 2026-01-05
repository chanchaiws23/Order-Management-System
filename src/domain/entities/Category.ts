export interface CategoryProps {
  id: string;
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryProps {
  id: string;
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export class Category {
  private readonly _id: string;
  private _parentId?: string;
  private _name: string;
  private _slug: string;
  private _description?: string;
  private _imageUrl?: string;
  private _isActive: boolean;
  private _sortOrder: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: CategoryProps) {
    this._id = props.id;
    this._parentId = props.parentId;
    this._name = props.name;
    this._slug = props.slug;
    this._description = props.description;
    this._imageUrl = props.imageUrl;
    this._isActive = props.isActive;
    this._sortOrder = props.sortOrder;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateCategoryProps): Category {
    if (!props.name || props.name.trim() === '') {
      throw new Error('Category name is required');
    }
    if (!props.slug || props.slug.trim() === '') {
      throw new Error('Category slug is required');
    }

    const now = new Date();
    return new Category({
      ...props,
      isActive: true,
      sortOrder: props.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(props);
  }

  get id(): string { return this._id; }
  get parentId(): string | undefined { return this._parentId; }
  get name(): string { return this._name; }
  get slug(): string { return this._slug; }
  get description(): string | undefined { return this._description; }
  get imageUrl(): string | undefined { return this._imageUrl; }
  get isActive(): boolean { return this._isActive; }
  get sortOrder(): number { return this._sortOrder; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  update(data: Partial<Omit<CreateCategoryProps, 'id'>>): void {
    if (data.parentId !== undefined) this._parentId = data.parentId;
    if (data.name !== undefined) this._name = data.name;
    if (data.slug !== undefined) this._slug = data.slug;
    if (data.description !== undefined) this._description = data.description;
    if (data.imageUrl !== undefined) this._imageUrl = data.imageUrl;
    if (data.sortOrder !== undefined) this._sortOrder = data.sortOrder;
    this.touch();
  }

  activate(): void {
    this._isActive = true;
    this.touch();
  }

  deactivate(): void {
    this._isActive = false;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toObject(): CategoryProps {
    return {
      id: this._id,
      parentId: this._parentId,
      name: this._name,
      slug: this._slug,
      description: this._description,
      imageUrl: this._imageUrl,
      isActive: this._isActive,
      sortOrder: this._sortOrder,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
