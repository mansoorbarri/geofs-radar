import { NextRequest, NextResponse } from 'next/server';

const activeAircraft = new Map();

export async function DELETE(
  req: NextRequest,
  { params }: { params: { aircraftId: string } }
) {
  try {
    const { aircraftId } = params;

    if (!aircraftId) {
      return NextResponse.json(
        { error: 'Aircraft ID required' },
        { status: 400 }
      );
    }

    const existed = activeAircraft.has(aircraftId);
    activeAircraft.delete(aircraftId);

    console.log(`[ATC-API] Cleared aircraft: ${aircraftId}`);

    return NextResponse.json({
      success: true,
      message: existed ? 'Aircraft cleared' : 'Aircraft not found',
      aircraftId,
    });

  } catch (error) {
    console.error('[ATC-API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}