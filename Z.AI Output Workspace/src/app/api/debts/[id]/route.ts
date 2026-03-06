import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/debts/[id]
 * Get details of a specific debt including history
 * 
 * Response: Debt object with full details and history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const debt = await db.debt.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { recordedAt: 'desc' },
          take: 24, // Last 24 months of history
        },
      },
    });

    if (!debt) {
      return NextResponse.json({
        success: false,
        error: 'Debt not found',
        message: `No debt found with id: ${id}`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: debt,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching debt:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch debt',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/debts/[id]
 * Update an existing debt
 * 
 * Request Body: Any updatable fields
 * Response: Updated debt object
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if debt exists
    const existingDebt = await db.debt.findUnique({
      where: { id },
    });

    if (!existingDebt) {
      return NextResponse.json({
        success: false,
        error: 'Debt not found',
        message: `No debt found with id: ${id}`,
      }, { status: 404 });
    }

    // Build update data
    const updateData: Prisma.DebtUpdateInput = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
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
    if (body.originalAmount !== undefined) updateData.originalAmount = body.originalAmount;
    if (body.interestRate !== undefined) updateData.interestRate = body.interestRate;
    if (body.minimumPayment !== undefined) updateData.minimumPayment = body.minimumPayment;
    if (body.monthlyPayment !== undefined) updateData.monthlyPayment = body.monthlyPayment;
    if (body.studentLoanPlan !== undefined) updateData.studentLoanPlan = body.studentLoanPlan;
    if (body.propertyValue !== undefined) updateData.propertyValue = body.propertyValue;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.targetEndDate !== undefined) updateData.targetEndDate = body.targetEndDate ? new Date(body.targetEndDate) : null;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const debt = await db.debt.update({
      where: { id },
      data: updateData,
    });

    // If balance changed, add to history
    if (body.balance !== undefined && body.balance !== existingDebt.balance) {
      await db.debtHistory.create({
        data: {
          debtId: debt.id,
          balance: body.balance,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: debt,
      message: 'Debt updated successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating debt:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update debt',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/debts/[id]
 * Delete a debt
 * 
 * Response: Success message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if debt exists
    const existingDebt = await db.debt.findUnique({
      where: { id },
    });

    if (!existingDebt) {
      return NextResponse.json({
        success: false,
        error: 'Debt not found',
        message: `No debt found with id: ${id}`,
      }, { status: 404 });
    }

    // Delete associated history first
    await db.debtHistory.deleteMany({
      where: { debtId: id },
    });

    // Delete the debt
    await db.debt.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Debt deleted successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting debt:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete debt',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
