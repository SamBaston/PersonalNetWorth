import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/assets
 * List all assets with optional filtering
 * 
 * Query Parameters:
 * - type: Filter by asset type (BANK_CURRENT, BANK_SAVINGS, ISA, LISA, STOCK, PROPERTY, OTHER)
 * - category: Filter by category (CASH, INVESTMENT, PROPERTY)
 * 
 * Response: Array of assets with id, name, type, category, balance
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    const where: Prisma.AssetWhereInput = {};
    
    if (type) {
      where.type = type;
    }
    if (category) {
      where.category = category;
    }

    const assets = await db.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        history: {
          orderBy: { recordedAt: 'desc' },
          take: 12, // Last 12 months
        },
      },
    });

    // Return summary list for list view
    const summaryList = assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      category: asset.category,
      balance: asset.balance,
      currency: asset.currency,
      ticker: asset.ticker,
      shares: asset.shares,
      governmentBonus: asset.governmentBonus,
    }));

    return NextResponse.json({
      success: true,
      data: summaryList,
      total: summaryList.length,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch assets',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/assets
 * Create a new asset
 * 
 * Request Body:
 * - name: string (required)
 * - type: AssetType (required)
 * - category: AssetCategory (required)
 * - balance: number (required)
 * - currency: string (default: "GBP")
 * - isTaxAdvantaged: boolean (default: false)
 * - governmentBonus: number (optional, for LISA)
 * - ticker: string (optional, for stocks)
 * - shares: number (optional, for stocks)
 * - purchasePrice: number (optional, for stocks)
 * - annualReturnRate: number (default: 0)
 * - notes: string (optional)
 * 
 * Response: Created asset object
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.category || body.balance === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'name, type, category, and balance are required',
      }, { status: 400 });
    }

    // Validate balance is a valid number
    if (typeof body.balance !== 'number' || isNaN(body.balance)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid balance',
        message: 'balance must be a valid number',
      }, { status: 400 });
    }

    const asset = await db.asset.create({
      data: {
        name: body.name,
        type: body.type,
        category: body.category,
        balance: body.balance,
        currency: body.currency || 'GBP',
        isTaxAdvantaged: body.isTaxAdvantaged || false,
        governmentBonus: body.governmentBonus || null,
        ticker: body.ticker || null,
        shares: body.shares || null,
        purchasePrice: body.purchasePrice || null,
        annualReturnRate: body.annualReturnRate ?? 0,
        notes: body.notes || null,
      },
    });

    // Create initial history entry
    await db.assetHistory.create({
      data: {
        assetId: asset.id,
        balance: asset.balance,
      },
    });

    return NextResponse.json({
      success: true,
      data: asset,
      message: 'Asset created successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create asset',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
