import buttonBg from "../assets/button.png";

/**
 * Themed button that uses the Albion-style button.png as its background.
 * Variant controls the text color (default amber, danger rose, success emerald).
 */
export default function ThemedButton({
  children,
  onClick,
  className = "",
  title,
  variant = "default",
}) {
  const variants = {
    default: "text-[#F2B83B]",
    danger: "text-rose-100",
    success: "text-emerald-100",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        backgroundImage: `url(${buttonBg})`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        textShadow: "0 1px 2px rgba(0,0,0,0.8)",
      }}
      className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm min-w-0 sm:min-w-30 tracking-wide cursor-pointer hover:brightness-110 active:brightness-95 transition ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
