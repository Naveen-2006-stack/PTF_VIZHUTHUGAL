import { NextResponse } from 'next/server';
import { PATCH as handlePatch } from '../route';

// Forwards PATCH request to parent route, extracting id from params
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json().catch(() => ({}));
    const mergedBody = { ...body, attendanceId: resolvedParams.id || body.attendanceId };

    const customRequest = new Request(request.url, {
      method: 'PATCH',
      headers: request.headers,
      body: JSON.stringify(mergedBody),
    });

    return handlePatch(customRequest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
