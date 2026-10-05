// Figma 80:2. Rendered in one place at a time: inside the sticky bar on phones, where it sits
// above the trait chip, and in the page body on desktop. Never both — see useIsMobile.
export function PageTitle() {
  return (
    <h1 className="max-w-[928px] text-center font-semibold text-[28px] text-paper leading-none tracking-[-0.04em] md:mt-[68px] md:mb-[100px] md:text-left md:text-[40px]">
      {/* The design breaks the line explicitly rather than letting it wrap. Blocks only from md
          up, so the phone size still wraps to fit whatever width it has. */}
      <span className="md:block">Product personality moments,</span>{" "}
      <span className="md:block">curated by emotional trait.</span>
    </h1>
  )
}
