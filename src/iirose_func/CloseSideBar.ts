export function closeSidebar()
{
    const functionHolder = window.functionHolder
    const functionHolderDarker = window.functionHolderDarker
    const isMobile = window.isMobile

    // Ensure functionHolder[0] is valid and visible
    if (functionHolder[0] && functionHolder[0].style.display !== "none")
    {
        // Optional fade-out effect
        functionHolderDarker.stop().fadeOut(250, function ()
        {
            functionHolder[0].style.display = "none"; // Hide the first element (left sidebar)
            window.functionHolderP = 1; // Update state to indicate it's closed
        });

        // Remove slider or animations if necessary
        if (!isMobile && window.functionHolderSlider)
        {
            window.functionHolderSlider.style.display = "none";
        }

        // Ensure body styles are reset (if animations exist)
        if (window.Probe.functionHolderAnimate)
        {
            if (isMobile)
            {
                document.body.style.transition = "";
            }
            document.body.style.transform = "";
        }
    }
}