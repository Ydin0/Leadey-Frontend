/** Confirm dialog shown before calling a contact marked Do-Not-Contact.
 *  Returns true if the rep confirms they still want to place the call. */
export function confirmDncCall(name?: string | null): boolean {
  if (typeof window === "undefined") return true;
  return window.confirm(
    `${name || "This contact"} is marked Do Not Contact. Are you sure you want to call them?`,
  );
}
