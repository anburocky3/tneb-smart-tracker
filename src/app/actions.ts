"use server";

export async function verifyUserMpin(
  enteredMpin: string,
): Promise<{ success: boolean; message: string }> {
  const correctMpin = process.env.MPIN; // Safe here (Server-side)

  if (enteredMpin === correctMpin) {
    return { success: true, message: "Access Granted" };
  }

  return { success: false, message: "Invalid MPIN" };
}
