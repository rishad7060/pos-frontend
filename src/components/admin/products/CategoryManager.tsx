'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Folder, Tag } from 'lucide-react';
import type { Category } from '@/types/pos';

interface CategoryManagerProps {
    categories: Category[];
    onCreateCategory: (data: CategoryFormData) => Promise<void>;
    onUpdateCategory: (id: number, data: CategoryFormData) => Promise<void>;
    onDeleteCategory: (id: number) => Promise<void>;
    loading?: boolean;
}

export interface CategoryFormData {
    name: string;
    description: string | null;
}

/**
 * Category management section
 * Extracted from products admin page
 */
export function CategoryManager({
    categories,
    onCreateCategory,
    onUpdateCategory,
    onDeleteCategory,
    loading = false,
}: CategoryManagerProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');

    const resetForm = () => {
        setFormName('');
        setFormDescription('');
        setEditingCategory(null);
    };

    const openEditDialog = (category: Category) => {
        setEditingCategory(category);
        setFormName(category.name);
        setFormDescription(category.description || '');
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data: CategoryFormData = {
            name: formName,
            description: formDescription || null,
        };

        if (editingCategory) {
            await onUpdateCategory(editingCategory.id, data);
        } else {
            await onCreateCategory(data);
        }

        resetForm();
        setDialogOpen(false);
    };

    const handleDelete = async (category: Category) => {
        if (confirm(`Delete category "${category.name}"? Products in this category will not be deleted.`)) {
            await onDeleteCategory(category.id);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Folder className="h-5 w-5" />
                        Category Management
                    </CardTitle>

                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Category
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="categoryName">Category Name *</Label>
                                    <Input
                                        id="categoryName"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        required
                                        placeholder="e.g., Seafood, Spices, Dried Goods"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="categoryDescription">Description</Label>
                                    <Textarea
                                        id="categoryDescription"
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        placeholder="Category description (optional)"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button type="submit" disabled={loading || !formName} className="flex-1">
                                        {loading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setDialogOpen(false);
                                            resetForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent>
                {categories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No categories yet. Create one to organize your products.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <Badge
                                key={category.id}
                                variant="outline"
                                className="px-3 py-2 text-sm flex items-center gap-2"
                            >
                                <Tag className="h-3 w-3" />
                                <span>{category.name}</span>
                                <button
                                    onClick={() => openEditDialog(category)}
                                    className="ml-1 hover:text-primary"
                                    title="Edit category"
                                >
                                    <Edit className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={() => handleDelete(category)}
                                    className="ml-1 hover:text-destructive"
                                    title="Delete category"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
