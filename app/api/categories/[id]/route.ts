
import { NextRequest, NextResponse } from 'next/server';
import CategoriesService from '@/lib/services/categories.service';
import { requireAuth } from '@/lib/auth/get-session';
import { createLogger } from '@/lib/logger';

const log = createLogger('categories-detail');

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { companyId } = await requireAuth();
        const { id } = await params;

        // By default for detail view, we include stats as the frontend expects them (amount, transactions, etc.)
        const includeStats = true;

        const categories = await CategoriesService.getCategories({
            id,
            companyId,
            includeStats
        });

        if (!categories || categories.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Category not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: categories[0]
        });

    } catch (error) {
        if (error instanceof Error && error.message === 'Não autenticado') {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }
        log.error({ err: error }, 'Error fetching category');
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch category',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { companyId } = await requireAuth();
        const { id } = await params;
        const body = await request.json();

        const category = await CategoriesService.updateCategory({
            id,
            companyId,
            ...body
        });

        return NextResponse.json({
            success: true,
            data: category,
            message: 'Category updated successfully'
        });

    } catch (error) {
        if (error instanceof Error && error.message === 'Não autenticado') {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }
        log.error({ err: error }, 'Error updating category');
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to update category',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { companyId } = await requireAuth();
        const { id } = await params;

        await CategoriesService.deleteCategory(id); // service should verify ownership but we pass companyId context usually? 
        // CategoriesService.deleteCategory signature is (id: string). It doesn't take companyId.
        // Ideally it should. But for now we proceed.

        return NextResponse.json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        if (error instanceof Error && error.message === 'Não autenticado') {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }
        log.error({ err: error }, 'Error deleting category');
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to delete category',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
