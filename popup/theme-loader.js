// Apply saved theme IMMEDIATELY - CSS @media handles 'system' automatically
(function() {
    try {
        const theme = localStorage.getItem('fortiXWalletTheme');
        // Only add class for manual theme selection
        // 'system' or null = no class, let CSS @media query handle it
        if (theme === 'light') {
            document.documentElement.classList.add('light-theme');
        } else if (theme === 'dark') {
            document.documentElement.classList.add('dark-theme');
        }
    } catch(e) {}
})();
