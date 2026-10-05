// Figma 80:2. Rendered in one place at a time: inside the sticky bar on phones, where it sits
// above the trait chip, and in the page body on desktop. Never both — see useIsMobile.
export function PageTitle() {
  return (
    <h1 className="max-w-[928px] text-center font-semibold text-[28px] text-paper leading-none tracking-[-0.03em] md:mx-auto md:mt-[68px] md:mb-[100px] md:text-[40px] lg:text-[60px]">
      {/* The design breaks the line explicitly rather than letting it wrap. Blocks from md up, so
          the break lands on the comma at every size that can hold the longer half on one line.
          The phone cannot — at 28px that half is wider than the screen — so there it stays inline
          and wraps wherever it must. Between md and lg the type steps down to 40px and the block
          centres, because 60px needs 792px and a tablet has about 712px to give. */}
      <span className="md:block">Product personality moments,</span>{" "}
      <span className="md:block">curated by emotional trait.</span>
    </h1>
  )
}
