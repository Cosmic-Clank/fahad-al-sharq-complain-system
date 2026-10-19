import { toast as sonnerToast, type ExternalToast } from "sonner";
import { translateMessage } from "./messages-ar";

/**
 * Drop-in replacements for sonner's toast and window.alert/confirm that show
 * the message in the user's selected language (see lib/messages-ar.ts).
 */
export const toast = {
	success: (message: string, data?: ExternalToast) => sonnerToast.success(translateMessage(message), data),
	error: (message: string, data?: ExternalToast) => sonnerToast.error(translateMessage(message), data),
	warning: (message: string, data?: ExternalToast) => sonnerToast.warning(translateMessage(message), data),
	info: (message: string, data?: ExternalToast) => sonnerToast.info(translateMessage(message), data),
};

export function showAlert(message: string) {
	window.alert(translateMessage(message));
}

export function askConfirm(message: string): boolean {
	return window.confirm(translateMessage(message));
}
