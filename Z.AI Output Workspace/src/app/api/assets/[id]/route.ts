import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/assets/[id]
 * Get details of a specific asset including history
 * 
 * Response: Asset object with full details and history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const asset = await db.asset.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { recordedAt: 'desc' },
          take: 24, // Last 24 months of history
        },
      },
    });

    if (!asset) {
      return NextResponse.json({
        success: false,
        error: 'Asset not found',
        message: `No asset found with id: ${id}`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: asset,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/assets/[id]
 * Update an existing asset
 * 
 * Request Body: Any updatable fields
 * Response: Updated asset object
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if asset exists
    const existingAsset = await db.asset.findUnique({
      where: { id },
    });

    if (!existingAsset) {
      return NextResponse.json({
        success: false,
        error: 'Asset not found',
        message: `No asset found with id: ${id}`,
      }, { status: 404 });
    }

    // Build update data
    const updateData: Prisma.AssetUpdateInput = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.balance !== undefined) {
      if (typeof body.balance !== 'number' || isNaN(body.balance)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid balance',
          message: 'balance must be a valid number',
        }, { status: 400 });
      }
      updateData.balance = body.balance;
    }
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.isTaxAdvantaged !== undefined) updateData.isTaxAdvantaged = body.isTaxAdvantaged;
    if (body.governmentBonus !== undefined) updateData.governmentBonus = body.governmentBonus;
    if (body.ticker !== undefined) updateData.ticker = body.ticker;
    if (body.shares !== undefined) updateData.shares = body.shares;
    if (body.purchasePrice !== undefined) updateData.purchasePrice = body.purchasePrice;
    if (body.annualReturnRate !== undefined) updateData.annualReturnRate = body.annualReturnRate;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const asset = await db.asset.update({
      where: { id },
      data: updateData,
    });

    // If balance changed, add to history
    if (body.balance !== undefined && body.balance !== existingAsset.balance) {
      await db.assetHistory.create({
        data: {
          assetId: asset.id,
          balance: body.balance,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: asset,
      message: 'Asset updated successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/assets/[id]
 * Delete an asset
 * 
 * Response: Success message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if asset exists
    const existingAsset = await db.asset.findUnique({
      where: { id },
    });

    if (!existingAsset) {
      return NextResponse.json({
        success: false,
        error: 'Asset not found',
        message: `No asset found with id: ${id}`,
      }, { status: 404 });
    }

    // Delete associated history first
    await db.assetHistory.deleteMany({
      where: { assetId: id },
    });

    // Delete the asset
    await db.asset.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
