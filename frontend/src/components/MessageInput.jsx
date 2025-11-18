// frontend/src/components/MessageInput.jsx (FIXED - NO DUPLICATE SENDS)
import { useState, useRef, useEffect } from "react";
import { useMessages } from "../context/MessageContext";

const MessageInput = ({ receiverId }) => {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  // ✅ Typing indicator refs
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const keystrokeCountRef = useRef(0);

  const { sendMessage, sendImageMessage, emitTyping, emitStopTyping } =
    useMessages();

  // ✅ CONFIGURABLE: Minimum keystrokes before showing typing indicator
  const TYPING_THRESHOLD = 15;
  const TYPING_TIMEOUT = 2000;

  // ✅ FIX 1: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        emitStopTyping();
      }
      // Clean up image preview URL to prevent memory leaks
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [emitStopTyping, imagePreview]);

  // ✅ FIX 2: Clear form when receiver changes (prevents stale data)
  useEffect(() => {
    setText("");
    handleRemoveImage();
    keystrokeCountRef.current = 0;
  }, [receiverId]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }

      // ✅ Revoke old preview URL before creating new one
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }

      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    // ✅ Revoke object URL to free memory
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    // ✅ Count keystrokes (non-whitespace characters)
    const nonWhitespaceCount = newText.replace(/\s/g, "").length;
    keystrokeCountRef.current = nonWhitespaceCount;

    // ✅ ONLY emit typing if threshold is met
    if (keystrokeCountRef.current >= TYPING_THRESHOLD && !isTypingRef.current) {
      emitTyping();
      isTypingRef.current = true;
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // ✅ Send "stop typing" after inactivity (only if typing was started)
    if (isTypingRef.current) {
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping();
        isTypingRef.current = false;
        keystrokeCountRef.current = 0;
      }, TYPING_TIMEOUT);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!text.trim() && !selectedImage) return;

    // ✅ FIX 3: Prevent double submission
    if (sending) return;

    setSending(true);

    // ✅ Stop typing indicator immediately when sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      emitStopTyping();
      isTypingRef.current = false;
    }

    // ✅ Reset keystroke counter
    keystrokeCountRef.current = 0;

    try {
      if (selectedImage) {
        await sendImageMessage(receiverId, selectedImage);
        // ✅ FIX 4: Clear image IMMEDIATELY after successful send
        handleRemoveImage();
      }

      if (text.trim()) {
        await sendMessage(receiverId, text.trim());
      }

      // ✅ FIX 5: Clear text after successful send
      setText("");

      // ✅ FIX 6: Use replaceState to prevent form resubmission on refresh
      if (window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
      }
    } catch (error) {
      console.error("Send message error:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-theme bg-theme">
      {/* Image Preview */}
      {imagePreview && (
        <div className="p-4 border-b border-theme">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-20 object-cover rounded-lg"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-[var(--color-error)] text-white rounded-full w-6 h-6 flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 flex items-end gap-2">
        {/* Image Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 p-2 text-theme-secondary hover:text-primary hover:bg-[var(--color-primaryLight)] rounded-lg transition-colors"
          disabled={sending}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="w-full px-4 py-2 bg-theme text-theme border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none placeholder:text-theme-tertiary"
            disabled={sending}
            style={{ maxHeight: "120px" }}
          />

          {/* ✅ Visual feedback showing threshold progress */}
          {text.length > 0 && keystrokeCountRef.current < TYPING_THRESHOLD && (
            <div className="absolute -top-6 right-2 text-xs text-theme-tertiary">
              {keystrokeCountRef.current}/{TYPING_THRESHOLD}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!text.trim() && !selectedImage) || sending}
          className="flex-shrink-0 p-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
