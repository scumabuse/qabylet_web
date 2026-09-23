import { NextResponse } from "next/server";
import { seedGestures } from "@/app/actions";

export async function GET() {
  try {
    const result = await seedGestures();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
