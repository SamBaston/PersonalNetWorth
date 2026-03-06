import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/debts
 * List all debts with optional filtering
 * 
 * Query Parameters:
 * - type: Filter by debt type (STUDENT_LOAN, CREDIT_CARD, PERSONAL_LOAN, MORTGAGE, OTHER)
 * 
 * Response: Array of debts with id, name, type, balance
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where: Prisma.DebtWhereInput = {};
    
    if (type) {
      where.type = type;
    }

    const debts = await db.debt.findMany({
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
    const summaryList = debts.map(debt => ({
      id: debt.id,
      name: debt.name,
      type: debt.type,
      balance: debt.balance,
      originalAmount: debt.originalAmount,
      interestRate: debt.interestRate,
      minimumPayment: debt.minimumPayment,
      monthlyPayment: debt.monthlyPayment,
      studentLoanPlan: debt.studentLoanPlan,
      propertyValue: debt.propertyValue,
    }));

    return NextResponse.json({
      success: true,
      data: summaryList,
      total: summaryList.length,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching debts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch debts',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/debts
 * Create a new debt
 * 
 * Request Body:
 * - name: string (required)
 * - type: DebtType (required)
 * - balance: number (required)
 * - interestRate: number (required)
 * - originalAmount: number (optional)
 * - minimumPayment: number (optional)
 * - monthlyPayment: number (optional)
 * - studentLoanPlan: string (optional, for student loans)
 * - propertyValue: number (optional, for mortgages)
 * - startDate: string (optional, ISO date)
 * - targetEndDate: string (optional, ISO date)
 * - notes: string (optional)
 * 
 * Response: Created debt object
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type || body.balance === undefined || body.interestRate === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'name, type, balance, and interestRate are required',
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

    // Validate interestRate is a valid number
    if (typeof body.interestRate !== 'number' || isNaN(body.interestRate)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid interest rate',
        message: 'interestRate must be a valid number',
      }, { status: 400 });
    }

    const debt = await db.debt.create({
      data: {
        name: body.name,
        type: body.type,
        balance: body.balance,
        originalAmount: body.originalAmount || null,
        interestRate: body.interestRate,
        minimumPayment: body.minimumPayment || null,
        monthlyPayment: body.monthlyPayment || null,
        studentLoanPlan: body.studentLoanPlan || null,
        propertyValue: body.propertyValue || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : null,
        notes: body.notes || null,
      },
    });

    // Create initial history entry
    await db.debtHistory.create({
      data: {
        debtId: debt.id,
        balance: debt.balance,
      },
    });

    return NextResponse.json({
      success: true,
      data: debt,
      message: 'Debt created successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('Error creating debt:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create debt',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
