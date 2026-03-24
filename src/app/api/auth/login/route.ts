import { NextRequest, NextResponse } from "next/server";
import { authenticate, getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await authenticate(username, password);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.username = user.username;
    session.role = user.role;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ username: user.username, role: user.role });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
