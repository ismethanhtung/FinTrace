import { auth } from "../../auth";

export type AuthenticatedUser = {
  userId: string;
  email?: string | null;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;
    return {
      userId,
      email: session.user.email,
    };
  } catch {
    return null;
  }
}
