// ============ SETTINGS ============

// Settings state
let userSettings = {
    security: {
        autoLockTimeout: 5,
        hideBalances: false,
        quickApprove: false  // Hybrid approval: true = silent for trusted, false = always show popup
    },
    network: {
        defaultNetwork: '1',
        gasPreference: 'market'
    },
    display: {
        theme: 'system',
        language: 'en',
        currency: 'USD',
        balanceMode: 'fiat', // 'fiat' or 'crypto'
        mode: 'advanced' // 'beginner', 'advanced', or 'stealth'
    }
};

// i18n translations - Complete
const translations = {
    en: {
        forgeWallet: 'Forge Wallet',
        loading: 'Loading Forge Wallet...',
        send: 'Send',
        receive: 'Receive',
        bridge: 'Bridge',
        swap: 'Swap',
        buy: 'Buy',
        slippage: 'Slippage Tolerance',
        rate: 'Rate',
        priceImpact: 'Price Impact',
        minimumReceived: 'Minimum Received',
        route: 'Route',
        fetchingQuote: 'Fetching best price...',
        approve: 'Approve',
        tokens: 'Tokens',
        activity: 'Activity',
        assets: 'Assets',
        recentActivity: 'Recent Activity',
        noTransactions: 'No transactions yet',
        sent: 'Sent',
        received: 'Received',
        settings: 'Settings',
        security: 'Security',
        changePassword: 'Change Password',
        autoLockTimeout: 'Auto-lock Timeout',
        hideBalances: 'Hide Balances',
        exportSeedPhrase: 'Export Seed Phrase',
        exportPrivateKey: 'Export Private Key',
        network: 'Network',
        defaultNetwork: 'Default Network',
        gasPreference: 'Gas Preference',
        display: 'Display',
        theme: 'Theme',
        themeDark: 'Dark',
        themeLight: 'Light',
        language: 'Language',
        currency: 'Currency',
        advanced: 'Advanced',
        clearCache: 'Clear Cache',
        connectedSites: 'Connected Sites',
        resetWallet: 'Reset Wallet',
        about: 'About',
        version: 'Version',
        builtBy: 'Built by',
        cancel: 'Cancel',
        confirm: 'Confirm',
        continue: 'Continue',
        back: 'Back',
        copy: 'Copy',
        copyToClipboard: 'Copy to Clipboard',
        copyAddress: 'Copy Address',
        copied: 'Copied!',
        max: 'Max',
        close: 'Close',
        save: 'Save',
        update: 'Update',
        edit: 'Edit',
        sendTo: 'Send to',
        to: 'To',
        from: 'From',
        asset: 'Asset',
        amount: 'Amount',
        balance: 'Balance',
        available: 'available',
        enterAddress: 'Enter or paste a valid address',
        validAddress: 'Valid address',
        yourAccounts: 'Your accounts',
        insufficientBalance: 'Insufficient balance',
        insufficientBalanceGas: 'Insufficient balance for gas',
        review: 'Review',
        networkFee: 'Network fee',
        speed: 'Speed',
        calculatingGas: 'Calculating gas fee...',
        yourAddress: 'Your Address',
        scanQR: 'Scan this QR code',
        account: 'Account',
        selectAccount: 'Select Account',
        addAccount: 'Add Account',
        renameAccount: 'Rename Account',
        accountName: 'Account Name',
        enterNewName: 'Enter new name',
        lockWallet: 'Lock Wallet',
        contactSupport: 'Contact Support',
        importTokens: 'Import Tokens',
        addToken: 'Add Token',
        popular: 'Popular',
        custom: 'Custom',
        tokenContractAddress: 'Token Contract Address',
        tokenSymbol: 'Token Symbol',
        decimals: 'Decimals',
        addCustomToken: 'Add Custom Token',
        yourBalance: 'Your Balance',
        removeToken: 'Remove Token',
        marketData: 'Market Data',
        marketCap: 'Market Cap',
        volume24h: '24h Volume',
        high24h: '24h High',
        low24h: '24h Low',
        allTimeHigh: 'All-Time High',
        bridgeAssets: 'Bridge Assets',
        fromNetwork: 'From Network',
        toNetwork: 'To Network',
        password: 'Password',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        createPassword: 'Create a password',
        enterPassword: 'Enter your password',
        enterPasswordToContinue: 'Enter your password to continue',
        passwordMinLength: 'Password must be at least 8 characters',
        passwordsDoNotMatch: 'Passwords do not match',
        invalidPassword: 'Invalid password',
        createPasswordLabel: 'Create a strong password (Latin letters, numbers, symbols only)',
        passwordWarning: 'Password is used to encrypt your wallet. Store it safely - it cannot be recovered.',
        seedPhrase: 'Seed Phrase',
        showSeedPhrase: 'Show Seed Phrase',
        seedPhraseWarning: 'Never share your seed phrase! Anyone with these words can access all your funds.',
        enterSeedPhrase: 'Enter your 12-word seed phrase',
        privateKey: 'Private Key',
        showPrivateKey: 'Show Private Key',
        privateKeyWarning: 'Never share your private key!',
        enterPrivateKey: 'Enter your private key',
        resetWarning: 'This will delete all wallet data. This action cannot be undone.',
        typeReset: 'Type RESET to confirm',
        cannotBeUndone: 'This action cannot be undone!',
        warning: 'Warning',
        passwordChanged: 'Password changed successfully',
        cacheCleared: 'Cache cleared',
        walletReset: 'Wallet reset successfully',
        networkChanged: 'Network changed',
        gasPrice: 'Gas Price',
        gasFee: 'Gas Fee',
        total: 'Total',
        pending: 'Pending',
        confirmed: 'Confirmed',
        failed: 'Failed',
        createWallet: 'Create Wallet',
        createNewWallet: 'Create New Wallet',
        importWallet: 'Import Wallet',
        importExistingWallet: 'Import Existing Wallet',
        welcomeTitle: 'Welcome to Forge Wallet',
        welcomeSubtitle: 'Secure Ethereum wallet with multi-chain bridge support',
        unlockWallet: 'Unlock Wallet',
        unlock: 'Unlock',
        needHelp: 'Need help?',
        contactSupportLink: 'Contact Support →',
        view: 'View',
        speedUp: 'Speed Up',
        transactionsWillAppear: 'Transactions will appear here after you send or receive crypto'
    },
    uk: {
        forgeWallet: 'Forge Wallet',
        loading: 'Завантаження Forge Wallet...',
        send: 'Надіслати',
        receive: 'Отримати',
        bridge: 'Міст',
        swap: 'Обмін',
        buy: 'Купити',
        slippage: 'Допустиме відхилення',
        rate: 'Курс',
        priceImpact: 'Вплив на ціну',
        minimumReceived: 'Мінімум отримаєте',
        route: 'Маршрут',
        fetchingQuote: 'Пошук найкращої ціни...',
        approve: 'Схвалити',
        tokens: 'Токени',
        activity: 'Активність',
        assets: 'Активи',
        recentActivity: 'Остання активність',
        noTransactions: 'Транзакцій поки немає',
        sent: 'Надіслано',
        received: 'Отримано',
        settings: 'Налаштування',
        security: 'Безпека',
        changePassword: 'Змінити пароль',
        autoLockTimeout: 'Автоблокування',
        hideBalances: 'Приховати баланси',
        exportSeedPhrase: 'Експорт сід-фрази',
        exportPrivateKey: 'Експорт приватного ключа',
        network: 'Мережа',
        defaultNetwork: 'Мережа за замовч.',
        gasPreference: 'Швидкість газу',
        display: 'Відображення',
        theme: 'Тема',
        themeDark: 'Темна',
        themeLight: 'Світла',
        language: 'Мова',
        currency: 'Валюта',
        advanced: 'Додатково',
        clearCache: 'Очистити кеш',
        connectedSites: 'Підключені сайти',
        resetWallet: 'Скинути гаманець',
        about: 'Про програму',
        version: 'Версія',
        builtBy: 'Розробник',
        cancel: 'Скасувати',
        confirm: 'Підтвердити',
        continue: 'Продовжити',
        back: 'Назад',
        copy: 'Копіювати',
        copyToClipboard: 'Копіювати',
        copyAddress: 'Копіювати адресу',
        copied: 'Скопійовано!',
        max: 'Макс',
        close: 'Закрити',
        save: 'Зберегти',
        update: 'Оновити',
        edit: 'Редагувати',
        sendTo: 'Отримувач',
        to: 'Кому',
        from: 'Від',
        asset: 'Актив',
        amount: 'Сума',
        balance: 'Баланс',
        available: 'доступно',
        enterAddress: 'Введіть або вставте адресу',
        validAddress: 'Адреса дійсна',
        yourAccounts: 'Ваші акаунти',
        insufficientBalance: 'Недостатньо коштів',
        insufficientBalanceGas: 'Недостатньо коштів для газу',
        review: 'Перевірити',
        networkFee: 'Комісія мережі',
        speed: 'Швидкість',
        calculatingGas: 'Розрахунок комісії...',
        yourAddress: 'Ваша адреса',
        scanQR: 'Скануйте QR-код',
        account: 'Акаунт',
        selectAccount: 'Вибрати акаунт',
        addAccount: 'Додати акаунт',
        renameAccount: 'Перейменувати акаунт',
        accountName: 'Назва акаунту',
        enterNewName: 'Введіть нову назву',
        lockWallet: 'Заблокувати гаманець',
        contactSupport: 'Підтримка',
        importTokens: 'Імпорт токенів',
        addToken: 'Додати токен',
        popular: 'Популярні',
        custom: 'Власний',
        tokenContractAddress: 'Адреса контракту',
        tokenSymbol: 'Символ токена',
        decimals: 'Десяткові знаки',
        addCustomToken: 'Додати власний токен',
        yourBalance: 'Ваш баланс',
        removeToken: 'Видалити токен',
        marketData: 'Ринкові дані',
        marketCap: 'Капіталізація',
        volume24h: 'Обсяг 24г',
        high24h: 'Макс 24г',
        low24h: 'Мін 24г',
        allTimeHigh: 'Історичний максимум',
        bridgeAssets: 'Переказ активів',
        fromNetwork: 'З мережі',
        toNetwork: 'В мережу',
        password: 'Пароль',
        currentPassword: 'Поточний пароль',
        newPassword: 'Новий пароль',
        confirmPassword: 'Підтвердіть пароль',
        createPassword: 'Створіть пароль',
        enterPassword: 'Введіть пароль',
        enterPasswordToContinue: 'Введіть пароль для продовження',
        passwordMinLength: 'Пароль має бути не менше 8 символів',
        passwordsDoNotMatch: 'Паролі не співпадають',
        invalidPassword: 'Невірний пароль',
        createPasswordLabel: 'Створіть надійний пароль (латинські літери, цифри, символи)',
        passwordWarning: 'Пароль використовується для шифрування гаманця. Зберігайте його надійно.',
        seedPhrase: 'Сід-фраза',
        showSeedPhrase: 'Показати сід-фразу',
        seedPhraseWarning: 'Ніколи не діліться сід-фразою!',
        enterSeedPhrase: 'Введіть вашу сід-фразу з 12 слів',
        privateKey: 'Приватний ключ',
        showPrivateKey: 'Показати приватний ключ',
        privateKeyWarning: 'Ніколи не діліться приватним ключем!',
        enterPrivateKey: 'Введіть ваш приватний ключ',
        resetWarning: 'Це видалить всі дані гаманця.',
        typeReset: 'Введіть RESET для підтвердження',
        cannotBeUndone: 'Цю дію неможливо скасувати!',
        warning: 'Увага',
        passwordChanged: 'Пароль успішно змінено',
        cacheCleared: 'Кеш очищено',
        walletReset: 'Гаманець скинуто',
        networkChanged: 'Мережу змінено',
        gasPrice: 'Ціна газу',
        gasFee: 'Комісія',
        total: 'Всього',
        pending: 'Очікується',
        confirmed: 'Підтверджено',
        failed: 'Помилка',
        createWallet: 'Створити гаманець',
        createNewWallet: 'Створити новий гаманець',
        importWallet: 'Імпортувати гаманець',
        importExistingWallet: 'Імпортувати існуючий гаманець',
        welcomeTitle: 'Ласкаво просимо до Forge Wallet',
        welcomeSubtitle: 'Безпечний Ethereum гаманець з підтримкою мостів',
        unlockWallet: 'Розблокувати гаманець',
        unlock: 'Розблокувати',
        needHelp: 'Потрібна допомога?',
        contactSupportLink: 'Звʼязатися з підтримкою →',
        view: 'Перегляд',
        speedUp: 'Прискорити',
        transactionsWillAppear: 'Транзакції зʼявляться тут після надсилання або отримання криптовалюти'
    },
    ru: {
        forgeWallet: 'Forge Wallet',
        loading: 'Загрузка Forge Wallet...',
        send: 'Отправить',
        receive: 'Получить',
        bridge: 'Мост',
        swap: 'Обмен',
        buy: 'Купить',
        slippage: 'Допустимое отклонение',
        rate: 'Курс',
        priceImpact: 'Влияние на цену',
        minimumReceived: 'Минимум получите',
        route: 'Маршрут',
        fetchingQuote: 'Поиск лучшей цены...',
        approve: 'Одобрить',
        tokens: 'Токены',
        activity: 'Активность',
        assets: 'Активы',
        recentActivity: 'Последняя активность',
        noTransactions: 'Транзакций пока нет',
        sent: 'Отправлено',
        received: 'Получено',
        settings: 'Настройки',
        security: 'Безопасность',
        changePassword: 'Сменить пароль',
        autoLockTimeout: 'Автоблокировка',
        hideBalances: 'Скрыть балансы',
        exportSeedPhrase: 'Экспорт сид-фразы',
        exportPrivateKey: 'Экспорт приватного ключа',
        network: 'Сеть',
        defaultNetwork: 'Сеть по умолч.',
        gasPreference: 'Скорость газа',
        display: 'Отображение',
        theme: 'Тема',
        themeDark: 'Тёмная',
        themeLight: 'Светлая',
        language: 'Язык',
        currency: 'Валюта',
        advanced: 'Дополнительно',
        clearCache: 'Очистить кэш',
        connectedSites: 'Подключённые сайты',
        resetWallet: 'Сбросить кошелёк',
        about: 'О программе',
        version: 'Версия',
        builtBy: 'Разработчик',
        cancel: 'Отмена',
        confirm: 'Подтвердить',
        continue: 'Продолжить',
        back: 'Назад',
        copy: 'Копировать',
        copyToClipboard: 'Копировать',
        copyAddress: 'Копировать адрес',
        copied: 'Скопировано!',
        max: 'Макс',
        close: 'Закрыть',
        save: 'Сохранить',
        update: 'Обновить',
        edit: 'Редактировать',
        sendTo: 'Получатель',
        to: 'Кому',
        from: 'От',
        asset: 'Актив',
        amount: 'Сумма',
        balance: 'Баланс',
        available: 'доступно',
        enterAddress: 'Введите или вставьте адрес',
        validAddress: 'Адрес действителен',
        yourAccounts: 'Ваши аккаунты',
        insufficientBalance: 'Недостаточно средств',
        insufficientBalanceGas: 'Недостаточно средств для газа',
        review: 'Проверить',
        networkFee: 'Комиссия сети',
        speed: 'Скорость',
        calculatingGas: 'Расчёт комиссии...',
        yourAddress: 'Ваш адрес',
        scanQR: 'Сканируйте QR-код',
        account: 'Аккаунт',
        selectAccount: 'Выбрать аккаунт',
        addAccount: 'Добавить аккаунт',
        renameAccount: 'Переименовать аккаунт',
        accountName: 'Название аккаунта',
        enterNewName: 'Введите новое имя',
        lockWallet: 'Заблокировать кошелёк',
        contactSupport: 'Поддержка',
        importTokens: 'Импорт токенов',
        addToken: 'Добавить токен',
        popular: 'Популярные',
        custom: 'Свой',
        tokenContractAddress: 'Адрес контракта',
        tokenSymbol: 'Символ токена',
        decimals: 'Десятичные знаки',
        addCustomToken: 'Добавить свой токен',
        yourBalance: 'Ваш баланс',
        removeToken: 'Удалить токен',
        marketData: 'Рыночные данные',
        marketCap: 'Капитализация',
        volume24h: 'Объём 24ч',
        high24h: 'Макс 24ч',
        low24h: 'Мин 24ч',
        allTimeHigh: 'Исторический максимум',
        bridgeAssets: 'Перевод активов',
        fromNetwork: 'Из сети',
        toNetwork: 'В сеть',
        password: 'Пароль',
        currentPassword: 'Текущий пароль',
        newPassword: 'Новый пароль',
        confirmPassword: 'Подтвердите пароль',
        createPassword: 'Создайте пароль',
        enterPassword: 'Введите пароль',
        enterPasswordToContinue: 'Введите пароль для продолжения',
        passwordMinLength: 'Пароль должен быть не менее 8 символов',
        passwordsDoNotMatch: 'Пароли не совпадают',
        invalidPassword: 'Неверный пароль',
        createPasswordLabel: 'Создайте надёжный пароль (латинские буквы, цифры, символы)',
        passwordWarning: 'Пароль используется для шифрования кошелька. Храните его надёжно.',
        seedPhrase: 'Сид-фраза',
        showSeedPhrase: 'Показать сид-фразу',
        seedPhraseWarning: 'Никогда не делитесь сид-фразой!',
        enterSeedPhrase: 'Введите вашу сид-фразу из 12 слов',
        privateKey: 'Приватный ключ',
        showPrivateKey: 'Показать приватный ключ',
        privateKeyWarning: 'Никогда не делитесь приватным ключом!',
        enterPrivateKey: 'Введите ваш приватный ключ',
        resetWarning: 'Это удалит все данные кошелька.',
        typeReset: 'Введите RESET для подтверждения',
        cannotBeUndone: 'Это действие нельзя отменить!',
        warning: 'Внимание',
        passwordChanged: 'Пароль успешно изменён',
        cacheCleared: 'Кэш очищен',
        walletReset: 'Кошелёк сброшен',
        networkChanged: 'Сеть изменена',
        gasPrice: 'Цена газа',
        gasFee: 'Комиссия',
        total: 'Всего',
        pending: 'Ожидается',
        confirmed: 'Подтверждено',
        failed: 'Ошибка',
        createWallet: 'Создать кошелёк',
        createNewWallet: 'Создать новый кошелёк',
        importWallet: 'Импортировать кошелёк',
        importExistingWallet: 'Импортировать существующий кошелёк',
        welcomeTitle: 'Добро пожаловать в Forge Wallet',
        welcomeSubtitle: 'Безопасный Ethereum кошелёк с поддержкой мостов',
        unlockWallet: 'Разблокировать кошелёк',
        unlock: 'Разблокировать',
        needHelp: 'Нужна помощь?',
        contactSupportLink: 'Связаться с поддержкой →',
        view: 'Просмотр',
        speedUp: 'Ускорить',
        transactionsWillAppear: 'Транзакции появятся здесь после отправки или получения криптовалюты'
    },
    es: {
        forgeWallet: 'Forge Wallet',
        loading: 'Cargando Forge Wallet...',
        send: 'Enviar',
        receive: 'Recibir',
        bridge: 'Puente',
        swap: 'Intercambiar',
        buy: 'Comprar',
        slippage: 'Tolerancia de deslizamiento',
        rate: 'Tasa',
        priceImpact: 'Impacto en el precio',
        minimumReceived: 'Mínimo recibido',
        route: 'Ruta',
        fetchingQuote: 'Buscando mejor precio...',
        approve: 'Aprobar',
        tokens: 'Tokens',
        activity: 'Actividad',
        assets: 'Activos',
        recentActivity: 'Actividad reciente',
        noTransactions: 'Sin transacciones aún',
        sent: 'Enviado',
        received: 'Recibido',
        settings: 'Configuración',
        security: 'Seguridad',
        changePassword: 'Cambiar contraseña',
        autoLockTimeout: 'Bloqueo automático',
        hideBalances: 'Ocultar saldos',
        exportSeedPhrase: 'Exportar frase semilla',
        exportPrivateKey: 'Exportar clave privada',
        network: 'Red',
        defaultNetwork: 'Red predeterminada',
        gasPreference: 'Preferencia de gas',
        display: 'Pantalla',
        theme: 'Tema',
        themeDark: 'Oscuro',
        themeLight: 'Claro',
        language: 'Idioma',
        currency: 'Moneda',
        advanced: 'Avanzado',
        clearCache: 'Limpiar caché',
        connectedSites: 'Sitios conectados',
        resetWallet: 'Restablecer billetera',
        about: 'Acerca de',
        version: 'Versión',
        builtBy: 'Desarrollado por',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        continue: 'Continuar',
        back: 'Atrás',
        copy: 'Copiar',
        copyToClipboard: 'Copiar al portapapeles',
        copyAddress: 'Copiar dirección',
        copied: '¡Copiado!',
        max: 'Máx',
        close: 'Cerrar',
        save: 'Guardar',
        update: 'Actualizar',
        edit: 'Editar',
        sendTo: 'Enviar a',
        to: 'Para',
        from: 'De',
        asset: 'Activo',
        amount: 'Cantidad',
        balance: 'Saldo',
        available: 'disponible',
        enterAddress: 'Ingrese o pegue una dirección válida',
        validAddress: 'Dirección válida',
        yourAccounts: 'Tus cuentas',
        insufficientBalance: 'Saldo insuficiente',
        insufficientBalanceGas: 'Saldo insuficiente para gas',
        review: 'Revisar',
        networkFee: 'Comisión de red',
        speed: 'Velocidad',
        calculatingGas: 'Calculando comisión...',
        yourAddress: 'Tu dirección',
        scanQR: 'Escanea el código QR',
        account: 'Cuenta',
        selectAccount: 'Seleccionar cuenta',
        addAccount: 'Agregar cuenta',
        renameAccount: 'Renombrar cuenta',
        accountName: 'Nombre de cuenta',
        enterNewName: 'Ingrese nuevo nombre',
        lockWallet: 'Bloquear billetera',
        contactSupport: 'Soporte',
        importTokens: 'Importar tokens',
        addToken: 'Agregar token',
        popular: 'Popular',
        custom: 'Personalizado',
        tokenContractAddress: 'Dirección del contrato',
        tokenSymbol: 'Símbolo del token',
        decimals: 'Decimales',
        addCustomToken: 'Agregar token personalizado',
        yourBalance: 'Tu saldo',
        removeToken: 'Eliminar token',
        marketData: 'Datos de mercado',
        marketCap: 'Capitalización',
        volume24h: 'Volumen 24h',
        high24h: 'Máx 24h',
        low24h: 'Mín 24h',
        allTimeHigh: 'Máximo histórico',
        bridgeAssets: 'Transferir activos',
        fromNetwork: 'Desde red',
        toNetwork: 'A red',
        password: 'Contraseña',
        currentPassword: 'Contraseña actual',
        newPassword: 'Nueva contraseña',
        confirmPassword: 'Confirmar contraseña',
        createPassword: 'Crear contraseña',
        enterPassword: 'Ingrese su contraseña',
        enterPasswordToContinue: 'Ingrese su contraseña para continuar',
        passwordMinLength: 'La contraseña debe tener al menos 8 caracteres',
        passwordsDoNotMatch: 'Las contraseñas no coinciden',
        invalidPassword: 'Contraseña inválida',
        createPasswordLabel: 'Cree una contraseña segura (letras, números, símbolos)',
        passwordWarning: 'La contraseña se usa para cifrar su billetera. Guárdela de forma segura.',
        seedPhrase: 'Frase semilla',
        showSeedPhrase: 'Mostrar frase semilla',
        seedPhraseWarning: '¡Nunca comparta su frase semilla!',
        enterSeedPhrase: 'Ingrese su frase semilla de 12 palabras',
        privateKey: 'Clave privada',
        showPrivateKey: 'Mostrar clave privada',
        privateKeyWarning: '¡Nunca comparta su clave privada!',
        enterPrivateKey: 'Ingrese su clave privada',
        resetWarning: 'Esto eliminará todos los datos de la billetera.',
        typeReset: 'Escriba RESET para confirmar',
        cannotBeUndone: '¡Esta acción no se puede deshacer!',
        warning: 'Advertencia',
        passwordChanged: 'Contraseña cambiada exitosamente',
        cacheCleared: 'Caché limpiado',
        walletReset: 'Billetera restablecida',
        networkChanged: 'Red cambiada',
        gasPrice: 'Precio del gas',
        gasFee: 'Comisión',
        total: 'Total',
        pending: 'Pendiente',
        confirmed: 'Confirmado',
        failed: 'Fallido',
        createWallet: 'Crear billetera',
        createNewWallet: 'Crear nueva billetera',
        importWallet: 'Importar billetera',
        importExistingWallet: 'Importar billetera existente',
        welcomeTitle: 'Bienvenido a Forge Wallet',
        welcomeSubtitle: 'Billetera Ethereum segura con soporte de puentes',
        unlockWallet: 'Desbloquear billetera',
        unlock: 'Desbloquear',
        needHelp: '¿Necesita ayuda?',
        contactSupportLink: 'Contactar soporte →',
        view: 'Ver',
        speedUp: 'Acelerar',
        transactionsWillAppear: 'Las transacciones aparecerán aquí después de enviar o recibir cripto'
    },
    de: {
        forgeWallet: 'Forge Wallet',
        loading: 'Forge Wallet wird geladen...',
        send: 'Senden',
        receive: 'Empfangen',
        bridge: 'Brücke',
        swap: 'Tauschen',
        buy: 'Kaufen',
        slippage: 'Slippage-Toleranz',
        rate: 'Kurs',
        priceImpact: 'Preisauswirkung',
        minimumReceived: 'Minimum erhalten',
        route: 'Route',
        fetchingQuote: 'Bester Preis wird gesucht...',
        approve: 'Genehmigen',
        tokens: 'Token',
        activity: 'Aktivität',
        assets: 'Vermögen',
        recentActivity: 'Letzte Aktivität',
        noTransactions: 'Noch keine Transaktionen',
        sent: 'Gesendet',
        received: 'Empfangen',
        settings: 'Einstellungen',
        security: 'Sicherheit',
        changePassword: 'Passwort ändern',
        autoLockTimeout: 'Auto-Sperre',
        hideBalances: 'Guthaben ausblenden',
        exportSeedPhrase: 'Seed-Phrase exportieren',
        exportPrivateKey: 'Privaten Schlüssel exportieren',
        network: 'Netzwerk',
        defaultNetwork: 'Standardnetzwerk',
        gasPreference: 'Gas-Präferenz',
        display: 'Anzeige',
        theme: 'Design',
        themeDark: 'Dunkel',
        themeLight: 'Hell',
        language: 'Sprache',
        currency: 'Währung',
        advanced: 'Erweitert',
        clearCache: 'Cache leeren',
        connectedSites: 'Verbundene Seiten',
        resetWallet: 'Wallet zurücksetzen',
        about: 'Über',
        version: 'Version',
        builtBy: 'Entwickelt von',
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
        continue: 'Weiter',
        back: 'Zurück',
        copy: 'Kopieren',
        copyToClipboard: 'In Zwischenablage kopieren',
        copyAddress: 'Adresse kopieren',
        copied: 'Kopiert!',
        max: 'Max',
        close: 'Schließen',
        save: 'Speichern',
        update: 'Aktualisieren',
        edit: 'Bearbeiten',
        sendTo: 'Senden an',
        to: 'An',
        from: 'Von',
        asset: 'Vermögenswert',
        amount: 'Betrag',
        balance: 'Guthaben',
        available: 'verfügbar',
        enterAddress: 'Geben Sie eine gültige Adresse ein',
        validAddress: 'Gültige Adresse',
        yourAccounts: 'Ihre Konten',
        insufficientBalance: 'Unzureichendes Guthaben',
        insufficientBalanceGas: 'Unzureichendes Guthaben für Gas',
        review: 'Überprüfen',
        networkFee: 'Netzwerkgebühr',
        speed: 'Geschwindigkeit',
        calculatingGas: 'Berechne Gebühr...',
        yourAddress: 'Ihre Adresse',
        scanQR: 'QR-Code scannen',
        account: 'Konto',
        selectAccount: 'Konto auswählen',
        addAccount: 'Konto hinzufügen',
        renameAccount: 'Konto umbenennen',
        accountName: 'Kontoname',
        enterNewName: 'Neuen Namen eingeben',
        lockWallet: 'Wallet sperren',
        contactSupport: 'Support',
        importTokens: 'Token importieren',
        addToken: 'Token hinzufügen',
        popular: 'Beliebt',
        custom: 'Benutzerdefiniert',
        tokenContractAddress: 'Vertragsadresse',
        tokenSymbol: 'Token-Symbol',
        decimals: 'Dezimalstellen',
        addCustomToken: 'Benutzerdefinierten Token hinzufügen',
        yourBalance: 'Ihr Guthaben',
        removeToken: 'Token entfernen',
        marketData: 'Marktdaten',
        marketCap: 'Marktkapitalisierung',
        volume24h: 'Volumen 24h',
        high24h: 'Hoch 24h',
        low24h: 'Tief 24h',
        allTimeHigh: 'Allzeithoch',
        bridgeAssets: 'Vermögen übertragen',
        fromNetwork: 'Von Netzwerk',
        toNetwork: 'Zu Netzwerk',
        password: 'Passwort',
        currentPassword: 'Aktuelles Passwort',
        newPassword: 'Neues Passwort',
        confirmPassword: 'Passwort bestätigen',
        createPassword: 'Passwort erstellen',
        enterPassword: 'Passwort eingeben',
        enterPasswordToContinue: 'Passwort eingeben zum Fortfahren',
        passwordMinLength: 'Passwort muss mindestens 8 Zeichen haben',
        passwordsDoNotMatch: 'Passwörter stimmen nicht überein',
        invalidPassword: 'Ungültiges Passwort',
        createPasswordLabel: 'Erstellen Sie ein starkes Passwort (Buchstaben, Zahlen, Symbole)',
        passwordWarning: 'Das Passwort wird zur Verschlüsselung verwendet. Bewahren Sie es sicher auf.',
        seedPhrase: 'Seed-Phrase',
        showSeedPhrase: 'Seed-Phrase anzeigen',
        seedPhraseWarning: 'Teilen Sie niemals Ihre Seed-Phrase!',
        enterSeedPhrase: 'Geben Sie Ihre 12-Wort Seed-Phrase ein',
        privateKey: 'Privater Schlüssel',
        showPrivateKey: 'Privaten Schlüssel anzeigen',
        privateKeyWarning: 'Teilen Sie niemals Ihren privaten Schlüssel!',
        enterPrivateKey: 'Geben Sie Ihren privaten Schlüssel ein',
        resetWarning: 'Dies löscht alle Wallet-Daten.',
        typeReset: 'Geben Sie RESET zur Bestätigung ein',
        cannotBeUndone: 'Diese Aktion kann nicht rückgängig gemacht werden!',
        warning: 'Warnung',
        passwordChanged: 'Passwort erfolgreich geändert',
        cacheCleared: 'Cache geleert',
        walletReset: 'Wallet zurückgesetzt',
        networkChanged: 'Netzwerk geändert',
        gasPrice: 'Gas-Preis',
        gasFee: 'Gebühr',
        total: 'Gesamt',
        pending: 'Ausstehend',
        confirmed: 'Bestätigt',
        failed: 'Fehlgeschlagen',
        createWallet: 'Wallet erstellen',
        createNewWallet: 'Neue Wallet erstellen',
        importWallet: 'Wallet importieren',
        importExistingWallet: 'Bestehende Wallet importieren',
        welcomeTitle: 'Willkommen bei Forge Wallet',
        welcomeSubtitle: 'Sichere Ethereum Wallet mit Bridge-Unterstützung',
        unlockWallet: 'Wallet entsperren',
        unlock: 'Entsperren',
        needHelp: 'Hilfe benötigt?',
        contactSupportLink: 'Support kontaktieren →',
        view: 'Ansehen',
        speedUp: 'Beschleunigen',
        transactionsWillAppear: 'Transaktionen erscheinen hier nach dem Senden oder Empfangen'
    },
    zh: {
        forgeWallet: 'Forge 钱包',
        loading: '正在加载 Forge 钱包...',
        send: '发送',
        receive: '接收',
        bridge: '跨链',
        swap: '兑换',
        buy: '购买',
        slippage: '滑点容差',
        rate: '汇率',
        priceImpact: '价格影响',
        minimumReceived: '最低接收',
        route: '路由',
        fetchingQuote: '正在获取最佳价格...',
        approve: '批准',
        tokens: '代币',
        activity: '活动',
        assets: '资产',
        recentActivity: '最近活动',
        noTransactions: '暂无交易',
        sent: '已发送',
        received: '已接收',
        settings: '设置',
        security: '安全',
        changePassword: '更改密码',
        autoLockTimeout: '自动锁定',
        hideBalances: '隐藏余额',
        exportSeedPhrase: '导出助记词',
        exportPrivateKey: '导出私钥',
        network: '网络',
        defaultNetwork: '默认网络',
        gasPreference: 'Gas偏好',
        display: '显示',
        theme: '主题',
        themeDark: '深色',
        themeLight: '浅色',
        language: '语言',
        currency: '货币',
        advanced: '高级',
        clearCache: '清除缓存',
        connectedSites: '已连接网站',
        resetWallet: '重置钱包',
        about: '关于',
        version: '版本',
        builtBy: '开发者',
        cancel: '取消',
        confirm: '确认',
        continue: '继续',
        back: '返回',
        copy: '复制',
        copyToClipboard: '复制到剪贴板',
        copyAddress: '复制地址',
        copied: '已复制!',
        max: '最大',
        close: '关闭',
        save: '保存',
        update: '更新',
        edit: '编辑',
        sendTo: '发送至',
        to: '至',
        from: '从',
        asset: '资产',
        amount: '金额',
        balance: '余额',
        available: '可用',
        enterAddress: '输入或粘贴有效地址',
        validAddress: '有效地址',
        yourAccounts: '您的账户',
        insufficientBalance: '余额不足',
        insufficientBalanceGas: 'Gas余额不足',
        review: '审核',
        networkFee: '网络费用',
        speed: '速度',
        calculatingGas: '计算手续费...',
        yourAddress: '您的地址',
        scanQR: '扫描二维码',
        account: '账户',
        selectAccount: '选择账户',
        addAccount: '添加账户',
        renameAccount: '重命名账户',
        accountName: '账户名称',
        enterNewName: '输入新名称',
        lockWallet: '锁定钱包',
        contactSupport: '支持',
        importTokens: '导入代币',
        addToken: '添加代币',
        popular: '热门',
        custom: '自定义',
        tokenContractAddress: '合约地址',
        tokenSymbol: '代币符号',
        decimals: '小数位',
        addCustomToken: '添加自定义代币',
        yourBalance: '您的余额',
        removeToken: '移除代币',
        marketData: '市场数据',
        marketCap: '市值',
        volume24h: '24小时交易量',
        high24h: '24小时最高',
        low24h: '24小时最低',
        allTimeHigh: '历史最高',
        bridgeAssets: '转移资产',
        fromNetwork: '从网络',
        toNetwork: '到网络',
        password: '密码',
        currentPassword: '当前密码',
        newPassword: '新密码',
        confirmPassword: '确认密码',
        createPassword: '创建密码',
        enterPassword: '输入密码',
        enterPasswordToContinue: '输入密码以继续',
        passwordMinLength: '密码必须至少8个字符',
        passwordsDoNotMatch: '密码不匹配',
        invalidPassword: '密码无效',
        createPasswordLabel: '创建强密码（字母、数字、符号）',
        passwordWarning: '密码用于加密您的钱包。请妥善保管。',
        seedPhrase: '助记词',
        showSeedPhrase: '显示助记词',
        seedPhraseWarning: '永远不要分享您的助记词！',
        enterSeedPhrase: '输入您的12个助记词',
        privateKey: '私钥',
        showPrivateKey: '显示私钥',
        privateKeyWarning: '永远不要分享您的私钥！',
        enterPrivateKey: '输入您的私钥',
        resetWarning: '这将删除所有钱包数据。',
        typeReset: '输入RESET确认',
        cannotBeUndone: '此操作无法撤销！',
        warning: '警告',
        passwordChanged: '密码修改成功',
        cacheCleared: '缓存已清除',
        walletReset: '钱包已重置',
        networkChanged: '网络已更改',
        gasPrice: 'Gas价格',
        gasFee: '手续费',
        total: '总计',
        pending: '待处理',
        confirmed: '已确认',
        failed: '失败',
        createWallet: '创建钱包',
        createNewWallet: '创建新钱包',
        importWallet: '导入钱包',
        importExistingWallet: '导入现有钱包',
        welcomeTitle: '欢迎使用 Forge 钱包',
        welcomeSubtitle: '支持跨链桥接的安全以太坊钱包',
        unlockWallet: '解锁钱包',
        unlock: '解锁',
        needHelp: '需要帮助？',
        contactSupportLink: '联系支持 →',
        view: '查看',
        speedUp: '加速',
        transactionsWillAppear: '发送或接收加密货币后，交易将显示在这里'
    },
    fr: {
        forgeWallet: 'Forge Wallet',
        loading: 'Chargement de Forge Wallet...',
        send: 'Envoyer',
        receive: 'Recevoir',
        bridge: 'Pont',
        swap: 'Échanger',
        buy: 'Acheter',
        slippage: 'Tolérance de glissement',
        rate: 'Taux',
        priceImpact: 'Impact sur le prix',
        minimumReceived: 'Minimum reçu',
        route: 'Route',
        fetchingQuote: 'Recherche du meilleur prix...',
        approve: 'Approuver',
        tokens: 'Jetons',
        activity: 'Activité',
        assets: 'Actifs',
        recentActivity: 'Activité récente',
        noTransactions: 'Pas encore de transactions',
        sent: 'Envoyé',
        received: 'Reçu',
        settings: 'Paramètres',
        security: 'Sécurité',
        changePassword: 'Changer le mot de passe',
        autoLockTimeout: 'Verrouillage auto',
        hideBalances: 'Masquer les soldes',
        exportSeedPhrase: 'Exporter la phrase de récupération',
        exportPrivateKey: 'Exporter la clé privée',
        network: 'Réseau',
        defaultNetwork: 'Réseau par défaut',
        gasPreference: 'Préférence de gas',
        display: 'Affichage',
        theme: 'Thème',
        themeDark: 'Sombre',
        themeLight: 'Clair',
        language: 'Langue',
        currency: 'Devise',
        advanced: 'Avancé',
        clearCache: 'Vider le cache',
        connectedSites: 'Sites connectés',
        resetWallet: 'Réinitialiser le portefeuille',
        about: 'À propos',
        version: 'Version',
        builtBy: 'Développé par',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        continue: 'Continuer',
        back: 'Retour',
        copy: 'Copier',
        copyToClipboard: 'Copier dans le presse-papiers',
        copyAddress: 'Copier l\'adresse',
        copied: 'Copié !',
        max: 'Max',
        close: 'Fermer',
        save: 'Enregistrer',
        update: 'Mettre à jour',
        edit: 'Modifier',
        sendTo: 'Envoyer à',
        to: 'À',
        from: 'De',
        asset: 'Actif',
        amount: 'Montant',
        balance: 'Solde',
        available: 'disponible',
        enterAddress: 'Entrez ou collez une adresse valide',
        validAddress: 'Adresse valide',
        yourAccounts: 'Vos comptes',
        insufficientBalance: 'Solde insuffisant',
        insufficientBalanceGas: 'Solde insuffisant pour le gas',
        review: 'Vérifier',
        networkFee: 'Frais de réseau',
        speed: 'Vitesse',
        calculatingGas: 'Calcul des frais...',
        yourAddress: 'Votre adresse',
        scanQR: 'Scanner le code QR',
        account: 'Compte',
        selectAccount: 'Sélectionner un compte',
        addAccount: 'Ajouter un compte',
        renameAccount: 'Renommer le compte',
        accountName: 'Nom du compte',
        enterNewName: 'Entrez un nouveau nom',
        lockWallet: 'Verrouiller le portefeuille',
        contactSupport: 'Support',
        importTokens: 'Importer des jetons',
        addToken: 'Ajouter un jeton',
        popular: 'Populaire',
        custom: 'Personnalisé',
        tokenContractAddress: 'Adresse du contrat',
        tokenSymbol: 'Symbole du jeton',
        decimals: 'Décimales',
        addCustomToken: 'Ajouter un jeton personnalisé',
        yourBalance: 'Votre solde',
        removeToken: 'Supprimer le jeton',
        marketData: 'Données du marché',
        marketCap: 'Capitalisation',
        volume24h: 'Volume 24h',
        high24h: 'Haut 24h',
        low24h: 'Bas 24h',
        allTimeHigh: 'Plus haut historique',
        bridgeAssets: 'Transférer des actifs',
        fromNetwork: 'Depuis le réseau',
        toNetwork: 'Vers le réseau',
        password: 'Mot de passe',
        currentPassword: 'Mot de passe actuel',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le mot de passe',
        createPassword: 'Créer un mot de passe',
        enterPassword: 'Entrez votre mot de passe',
        enterPasswordToContinue: 'Entrez votre mot de passe pour continuer',
        passwordMinLength: 'Le mot de passe doit contenir au moins 8 caractères',
        passwordsDoNotMatch: 'Les mots de passe ne correspondent pas',
        invalidPassword: 'Mot de passe invalide',
        createPasswordLabel: 'Créez un mot de passe fort (lettres, chiffres, symboles)',
        passwordWarning: 'Le mot de passe sert à chiffrer votre portefeuille. Conservez-le en sécurité.',
        seedPhrase: 'Phrase de récupération',
        showSeedPhrase: 'Afficher la phrase de récupération',
        seedPhraseWarning: 'Ne partagez jamais votre phrase de récupération !',
        enterSeedPhrase: 'Entrez votre phrase de récupération de 12 mots',
        privateKey: 'Clé privée',
        showPrivateKey: 'Afficher la clé privée',
        privateKeyWarning: 'Ne partagez jamais votre clé privée !',
        enterPrivateKey: 'Entrez votre clé privée',
        resetWarning: 'Cela supprimera toutes les données du portefeuille.',
        typeReset: 'Tapez RESET pour confirmer',
        cannotBeUndone: 'Cette action est irréversible !',
        warning: 'Attention',
        passwordChanged: 'Mot de passe modifié avec succès',
        cacheCleared: 'Cache vidé',
        walletReset: 'Portefeuille réinitialisé',
        networkChanged: 'Réseau modifié',
        gasPrice: 'Prix du gas',
        gasFee: 'Frais',
        total: 'Total',
        pending: 'En attente',
        confirmed: 'Confirmé',
        failed: 'Échoué',
        createWallet: 'Créer un portefeuille',
        createNewWallet: 'Créer un nouveau portefeuille',
        importWallet: 'Importer un portefeuille',
        importExistingWallet: 'Importer un portefeuille existant',
        welcomeTitle: 'Bienvenue sur Forge Wallet',
        welcomeSubtitle: 'Portefeuille Ethereum sécurisé avec support des ponts',
        unlockWallet: 'Déverrouiller le portefeuille',
        unlock: 'Déverrouiller',
        needHelp: 'Besoin d\'aide ?',
        contactSupportLink: 'Contacter le support →',
        view: 'Voir',
        speedUp: 'Accélérer',
        transactionsWillAppear: 'Les transactions apparaîtront ici après envoi ou réception'
    },
    pt: {
        forgeWallet: 'Forge Wallet',
        loading: 'Carregando Forge Wallet...',
        send: 'Enviar',
        receive: 'Receber',
        bridge: 'Ponte',
        swap: 'Trocar',
        buy: 'Comprar',
        slippage: 'Tolerância de deslizamento',
        rate: 'Taxa',
        priceImpact: 'Impacto no preço',
        minimumReceived: 'Mínimo recebido',
        route: 'Rota',
        fetchingQuote: 'Buscando melhor preço...',
        approve: 'Aprovar',
        tokens: 'Tokens',
        activity: 'Atividade',
        assets: 'Ativos',
        recentActivity: 'Atividade recente',
        noTransactions: 'Sem transações ainda',
        sent: 'Enviado',
        received: 'Recebido',
        settings: 'Configurações',
        security: 'Segurança',
        changePassword: 'Alterar senha',
        autoLockTimeout: 'Bloqueio automático',
        hideBalances: 'Ocultar saldos',
        exportSeedPhrase: 'Exportar frase de recuperação',
        exportPrivateKey: 'Exportar chave privada',
        network: 'Rede',
        defaultNetwork: 'Rede padrão',
        gasPreference: 'Preferência de gas',
        display: 'Exibição',
        theme: 'Tema',
        themeDark: 'Escuro',
        themeLight: 'Claro',
        language: 'Idioma',
        currency: 'Moeda',
        advanced: 'Avançado',
        clearCache: 'Limpar cache',
        connectedSites: 'Sites conectados',
        resetWallet: 'Redefinir carteira',
        about: 'Sobre',
        version: 'Versão',
        builtBy: 'Desenvolvido por',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        continue: 'Continuar',
        back: 'Voltar',
        copy: 'Copiar',
        copyToClipboard: 'Copiar para área de transferência',
        copyAddress: 'Copiar endereço',
        copied: 'Copiado!',
        max: 'Máx',
        close: 'Fechar',
        save: 'Salvar',
        update: 'Atualizar',
        edit: 'Editar',
        sendTo: 'Enviar para',
        to: 'Para',
        from: 'De',
        asset: 'Ativo',
        amount: 'Quantia',
        balance: 'Saldo',
        available: 'disponível',
        enterAddress: 'Digite ou cole um endereço válido',
        validAddress: 'Endereço válido',
        yourAccounts: 'Suas contas',
        insufficientBalance: 'Saldo insuficiente',
        insufficientBalanceGas: 'Saldo insuficiente para gas',
        review: 'Revisar',
        networkFee: 'Taxa de rede',
        speed: 'Velocidade',
        calculatingGas: 'Calculando taxa...',
        yourAddress: 'Seu endereço',
        scanQR: 'Escaneie o código QR',
        account: 'Conta',
        selectAccount: 'Selecionar conta',
        addAccount: 'Adicionar conta',
        renameAccount: 'Renomear conta',
        accountName: 'Nome da conta',
        enterNewName: 'Digite um novo nome',
        lockWallet: 'Bloquear carteira',
        contactSupport: 'Suporte',
        importTokens: 'Importar tokens',
        addToken: 'Adicionar token',
        popular: 'Popular',
        custom: 'Personalizado',
        tokenContractAddress: 'Endereço do contrato',
        tokenSymbol: 'Símbolo do token',
        decimals: 'Decimais',
        addCustomToken: 'Adicionar token personalizado',
        yourBalance: 'Seu saldo',
        removeToken: 'Remover token',
        marketData: 'Dados de mercado',
        marketCap: 'Capitalização',
        volume24h: 'Volume 24h',
        high24h: 'Máx 24h',
        low24h: 'Mín 24h',
        allTimeHigh: 'Máxima histórica',
        bridgeAssets: 'Transferir ativos',
        fromNetwork: 'Da rede',
        toNetwork: 'Para rede',
        password: 'Senha',
        currentPassword: 'Senha atual',
        newPassword: 'Nova senha',
        confirmPassword: 'Confirmar senha',
        createPassword: 'Criar senha',
        enterPassword: 'Digite sua senha',
        enterPasswordToContinue: 'Digite sua senha para continuar',
        passwordMinLength: 'A senha deve ter pelo menos 8 caracteres',
        passwordsDoNotMatch: 'As senhas não coincidem',
        invalidPassword: 'Senha inválida',
        createPasswordLabel: 'Crie uma senha forte (letras, números, símbolos)',
        passwordWarning: 'A senha é usada para criptografar sua carteira. Guarde-a com segurança.',
        seedPhrase: 'Frase de recuperação',
        showSeedPhrase: 'Mostrar frase de recuperação',
        seedPhraseWarning: 'Nunca compartilhe sua frase de recuperação!',
        enterSeedPhrase: 'Digite sua frase de recuperação de 12 palavras',
        privateKey: 'Chave privada',
        showPrivateKey: 'Mostrar chave privada',
        privateKeyWarning: 'Nunca compartilhe sua chave privada!',
        enterPrivateKey: 'Digite sua chave privada',
        resetWarning: 'Isso excluirá todos os dados da carteira.',
        typeReset: 'Digite RESET para confirmar',
        cannotBeUndone: 'Esta ação não pode ser desfeita!',
        warning: 'Atenção',
        passwordChanged: 'Senha alterada com sucesso',
        cacheCleared: 'Cache limpo',
        walletReset: 'Carteira redefinida',
        networkChanged: 'Rede alterada',
        gasPrice: 'Preço do gas',
        gasFee: 'Taxa',
        total: 'Total',
        pending: 'Pendente',
        confirmed: 'Confirmado',
        failed: 'Falhou',
        createWallet: 'Criar carteira',
        createNewWallet: 'Criar nova carteira',
        importWallet: 'Importar carteira',
        importExistingWallet: 'Importar carteira existente',
        welcomeTitle: 'Bem-vindo ao Forge Wallet',
        welcomeSubtitle: 'Carteira Ethereum segura com suporte a pontes',
        unlockWallet: 'Desbloquear carteira',
        unlock: 'Desbloquear',
        needHelp: 'Precisa de ajuda?',
        contactSupportLink: 'Contatar suporte →',
        view: 'Ver',
        speedUp: 'Acelerar',
        transactionsWillAppear: 'As transações aparecerão aqui após enviar ou receber cripto'
    }
};

// Get translation
function t(key) {
    const lang = userSettings.display.language || 'en';
    return translations[lang]?.[key] || translations['en']?.[key] || key;
}

// Update all UI text with current language
function updateUILanguage() {
    const lang = userSettings.display.language || 'en';
    console.log('[i18n] Updating UI language to:', lang);
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);
        
        // Check if element has SVG inside (buttons with icons)
        const svg = el.querySelector('svg');
        if (svg) {
            // Preserve SVG, update text
            const span = el.querySelector('span');
            if (span) {
                span.textContent = translation;
            }
        } else {
            el.textContent = translation;
        }
    });
    
    // Update placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    
    // Update select options with data-i18n-option (no emoji)
    document.querySelectorAll('[data-i18n-option]').forEach(el => {
        const key = el.getAttribute('data-i18n-option');
        el.textContent = t(key);
    });
    
    console.log('[OK] UI language updated to:', lang);
}

// Load settings from storage
async function loadSettings() {
    const result = await chrome.storage.local.get(['userSettings']);
    if (result.userSettings) {
        userSettings = { ...userSettings, ...result.userSettings };
    }
    applySettings();
}

// Save settings to storage
async function saveSettings() {
    await chrome.storage.local.set({ userSettings });
}

// Apply settings to UI
async function applySettings() {
    // Auto-lock
    const autoLockSelect = document.getElementById('settingsAutoLock');
    if (autoLockSelect) autoLockSelect.value = userSettings.security.autoLockTimeout;

    // Hide balances
    const hideBalancesToggle = document.getElementById('settingsHideBalances');
    if (hideBalancesToggle) hideBalancesToggle.checked = userSettings.security.hideBalances;

    // Quick Approve (hybrid approval system)
    const quickApproveToggle = document.getElementById('settingsQuickApprove');
    if (quickApproveToggle) quickApproveToggle.checked = userSettings.security.quickApprove;

    // Default network
    const defaultNetworkSelect = document.getElementById('settingsDefaultNetwork');
    if (defaultNetworkSelect) defaultNetworkSelect.value = userSettings.network.defaultNetwork;

    // Gas preference
    const gasSelect = document.getElementById('settingsGasPreference');
    if (gasSelect) gasSelect.value = userSettings.network.gasPreference;

    // Interface Mode - Update active card
    const { walletMode } = await chrome.storage.local.get(['walletMode']);
    const currentMode = walletMode || 'advanced';
    document.querySelectorAll('.mode-card').forEach(card => {
        if (card.dataset.mode === currentMode) {
            card.classList.add('mode-card-active');
        } else {
            card.classList.remove('mode-card-active');
        }
    });

    // Theme
    const themeSelect = document.getElementById('settingsTheme');
    if (themeSelect) themeSelect.value = userSettings.display.theme || 'system';
    applyTheme(userSettings.display.theme || 'system');
    
    // Wallet Mode - update mode-card active state
    const activeMode = userSettings.display.mode || 'advanced';
    document.querySelectorAll('.mode-card').forEach(card => {
        if (card.dataset.mode === activeMode) {
            card.classList.add('mode-card-active');
        } else {
            card.classList.remove('mode-card-active');
        }
    });
    applyWalletMode(activeMode);

    // Language
    const languageSelect = document.getElementById('settingsLanguage');
    if (languageSelect) languageSelect.value = userSettings.display.language || 'en';

    // Currency
    const currencySelect = document.getElementById('settingsCurrency');
    if (currencySelect) currencySelect.value = userSettings.display.currency;

    // Apply hide balances effect
    updateBalanceVisibility();

    // Apply balance display mode
    updateBalanceDisplay();

    // Apply language translations
    updateUILanguage();
}

// Apply theme
function applyTheme(theme) {
    const html = document.documentElement;
    
    // Remove both manual theme classes first
    html.classList.remove('light-theme', 'dark-theme');
    
    if (theme === 'system') {
        // No class = CSS @media query handles it automatically
        // Nothing to do - CSS handles it
    } else if (theme === 'light') {
        html.classList.add('light-theme');
    } else if (theme === 'dark') {
        html.classList.add('dark-theme');
    }
    
    // Save to localStorage for instant load on next open
    try {
        localStorage.setItem('forgeWalletTheme', theme);
    } catch(e) {}
}

// Apply wallet mode (beginner/advanced/stealth)
function applyWalletMode(mode) {
    const html = document.documentElement;
    
    // Remove previous mode
    html.removeAttribute('data-mode');
    
    // Apply new mode (advanced uses default styles, no data-mode needed)
    if (mode === 'beginner' || mode === 'stealth') {
        html.setAttribute('data-mode', mode);
    }
    
    // Save to localStorage for instant load
    try {
        localStorage.setItem('forgeWalletMode', mode);
    } catch(e) {}
    
    console.log('Wallet mode applied:', mode);
}

// Setup system theme listener
function setupSystemThemeListener() {
    // CSS @media query handles system theme changes automatically
    // This listener is only needed if we want to do something extra
}

// Update balance visibility based on settings
function updateBalanceVisibility() {
    const hidden = userSettings.security.hideBalances;
    
    // Main balance elements (correct IDs from HTML)
    const mainBalanceEl = document.getElementById('balanceAmount');
    const mainBalanceUSDEl = document.getElementById('balanceUSD');
    
    if (mainBalanceEl) {
        if (hidden) {
            if (!mainBalanceEl.dataset.originalText || mainBalanceEl.dataset.originalText === '••••••') {
                mainBalanceEl.dataset.originalText = mainBalanceEl.textContent;
            }
            mainBalanceEl.textContent = '••••••';
        } else if (mainBalanceEl.dataset.originalText && mainBalanceEl.dataset.originalText !== '••••••') {
            mainBalanceEl.textContent = mainBalanceEl.dataset.originalText;
        }
    }
    
    if (mainBalanceUSDEl) {
        if (hidden) {
            if (!mainBalanceUSDEl.dataset.originalText || mainBalanceUSDEl.dataset.originalText === '••••••') {
                mainBalanceUSDEl.dataset.originalText = mainBalanceUSDEl.textContent;
            }
            mainBalanceUSDEl.textContent = '••••••';
        } else if (mainBalanceUSDEl.dataset.originalText && mainBalanceUSDEl.dataset.originalText !== '••••••') {
            mainBalanceUSDEl.textContent = mainBalanceUSDEl.dataset.originalText;
        }
    }
    
    // Token list balances - use correct selectors
    document.querySelectorAll('.token-item').forEach(item => {
        const amountEl = item.querySelector('.token-amount');
        const usdEl = item.querySelector('.token-balance-usd');
        
        if (amountEl) {
            if (hidden) {
                if (!amountEl.dataset.originalText || amountEl.dataset.originalText === '••••••') {
                    amountEl.dataset.originalText = amountEl.textContent;
                }
                amountEl.textContent = '••••••';
            } else if (amountEl.dataset.originalText && amountEl.dataset.originalText !== '••••••') {
                amountEl.textContent = amountEl.dataset.originalText;
            }
        }
        
        if (usdEl) {
            if (hidden) {
                if (!usdEl.dataset.originalText || usdEl.dataset.originalText === '••••••') {
                    usdEl.dataset.originalText = usdEl.textContent;
                }
                usdEl.textContent = '••••••';
            } else if (usdEl.dataset.originalText && usdEl.dataset.originalText !== '••••••') {
                usdEl.textContent = usdEl.dataset.originalText;
            }
        }
    });
}

// Setup Settings event listeners
function setupSettingsListeners() {
    console.log('[CONFIG] Setting up settings listeners...');
    
    // Accordion section toggles
    document.querySelectorAll('.settings-section-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.dataset.section;
            const sectionId = 'section' + section.charAt(0).toUpperCase() + section.slice(1);
            const content = document.getElementById(sectionId);
            const isOpen = header.classList.contains('open');
            
            // Close all sections
            document.querySelectorAll('.settings-section-header').forEach(h => h.classList.remove('open'));
            document.querySelectorAll('.settings-section-content').forEach(c => c.style.display = 'none');
            
            // Open clicked section if it was closed
            if (!isOpen && content) {
                header.classList.add('open');
                content.style.display = 'block';
            }
        });
    });
    
    // Open settings
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        console.log('[OK] Settings button found');
        settingsBtn.addEventListener('click', () => {
            console.log('⚙️ Settings button clicked');
            loadSettings();
            showSettingsMain();
            openModal('settingsModal');
        });
    } else {
        console.error('[ERROR] Settings button not found');
    }
    
    // Settings navigation
    document.getElementById('settingsChangePassword')?.addEventListener('click', showPasswordScreen);
    document.getElementById('settingsExportSeed')?.addEventListener('click', showSeedScreen);
    document.getElementById('settingsExportKey')?.addEventListener('click', showKeyScreen);
    document.getElementById('settingsResetWallet')?.addEventListener('click', showResetScreen);
    document.getElementById('settingsClearCache')?.addEventListener('click', clearCache);
    document.getElementById('settingsConnectedSites')?.addEventListener('click', () => {
        closeModal('settingsModal');
        showConnectedSitesModal();
    });
    
    // Back buttons
    document.getElementById('settingsPasswordBack')?.addEventListener('click', showSettingsMain);
    document.getElementById('settingsSeedBack')?.addEventListener('click', showSettingsMain);
    document.getElementById('settingsKeyBack')?.addEventListener('click', showSettingsMain);
    document.getElementById('settingsResetBack')?.addEventListener('click', showSettingsMain);
    
    // Settings changes
    document.getElementById('settingsAutoLock')?.addEventListener('change', (e) => {
        userSettings.security.autoLockTimeout = parseInt(e.target.value);
        saveSettings();
        // Reset timer with new timeout value
        resetInactivityTimer();
        // Update service worker with new timeout
        chrome.runtime.sendMessage({ 
            action: 'updateAutoLock', 
            timeout: userSettings.security.autoLockTimeout 
        });
        showToast('Auto-lock updated', 'success');
    });
    
    document.getElementById('settingsHideBalances')?.addEventListener('change', (e) => {
        userSettings.security.hideBalances = e.target.checked;
        saveSettings();
        updateBalanceVisibility();
        showToast(e.target.checked ? 'Balances hidden' : 'Balances visible', 'success');
    });
    
    document.getElementById('settingsQuickApprove')?.addEventListener('change', (e) => {
        userSettings.security.quickApprove = e.target.checked;
        saveSettings();
        showToast(e.target.checked ? 'Quick Approve enabled' : 'Quick Approve disabled', 'success');
    });
    
    document.getElementById('settingsDefaultNetwork')?.addEventListener('change', async (e) => {
        userSettings.network.defaultNetwork = e.target.value;
        saveSettings();
        
        // Also switch to this network now
        currentNetwork = e.target.value;
        await chrome.storage.local.set({ currentNetwork: e.target.value });
        updateNetworkSelectorDisplay(currentNetwork);
        
        showToast('Network changed to ' + NETWORKS[currentNetwork].name, 'success');
        
        // Reload wallet data for new network
        await loadWalletData();
    });
    
    document.getElementById('settingsGasPreference')?.addEventListener('change', (e) => {
        userSettings.network.gasPreference = e.target.value;
        saveSettings();
        showToast('Gas preference updated', 'success');
    });
    
    // Interface Mode - Card Selection
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', async () => {
            const newMode = card.dataset.mode;
            
            // Update active state
            document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('mode-card-active'));
            card.classList.add('mode-card-active');
            
            // Save and apply
            userSettings.display.mode = newMode;
            saveSettings();
            await chrome.storage.local.set({ walletMode: newMode });
            applyWalletMode(newMode);
            
            const modeNames = { beginner: 'Beginner', advanced: 'Advanced', stealth: 'Stealth' };
            showToast('Mode: ' + modeNames[newMode], 'success');
        });
    });

    // Theme
    document.getElementById('settingsTheme')?.addEventListener('change', (e) => {
        userSettings.display.theme = e.target.value;
        saveSettings();
        applyTheme(e.target.value);
        showToast('Theme updated', 'success');
    });
    
    // Language
    document.getElementById('settingsLanguage')?.addEventListener('change', (e) => {
        userSettings.display.language = e.target.value;
        saveSettings();
        updateUILanguage();
        showToast(t('language') + ': ' + e.target.options[e.target.selectedIndex].text, 'success');
    });
    
    document.getElementById('settingsCurrency')?.addEventListener('change', async (e) => {
        userSettings.display.currency = e.target.value;
        saveSettings();
        showToast('Currency updated to ' + e.target.value, 'success');
        // Refresh displayed prices
        await refreshCurrencyDisplay();
    });
    
    // Change Password
    document.getElementById('updatePasswordBtn')?.addEventListener('click', changePassword);
    
    // Export Seed
    document.getElementById('settingsShowSeedBtn')?.addEventListener('click', showSeedPhrase);
    document.getElementById('settingsCopySeedBtn')?.addEventListener('click', copySeedPhrase);
    
    // Export Private Key
    document.getElementById('showKeyBtn')?.addEventListener('click', showPrivateKey);
    document.getElementById('toggleKeyVisibility')?.addEventListener('click', toggleKeyVisibility);
    document.getElementById('copyKeyBtn')?.addEventListener('click', copyPrivateKey);
    
    // Reset Wallet
    document.getElementById('resetConfirmInput')?.addEventListener('input', (e) => {
        const btn = document.getElementById('confirmResetBtn');
        btn.disabled = e.target.value !== 'RESET';
    });
    document.getElementById('confirmResetBtn')?.addEventListener('click', resetWallet);
}

// Show main settings screen
function showSettingsMain() {
    document.getElementById('settingsMain').style.display = 'block';
    document.getElementById('settingsPasswordScreen').style.display = 'none';
    document.getElementById('settingsSeedScreen').style.display = 'none';
    document.getElementById('settingsKeyScreen').style.display = 'none';
    document.getElementById('settingsResetScreen').style.display = 'none';
}

// Show password change screen
function showPasswordScreen() {
    document.getElementById('settingsMain').style.display = 'none';
    document.getElementById('settingsPasswordScreen').style.display = 'block';
    
    // Clear inputs
    document.getElementById('currentPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';
    document.getElementById('currentPasswordError').style.display = 'none';
    document.getElementById('confirmPasswordError').style.display = 'none';
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('currentPasswordInput').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    
    // Validate current password
    if (!currentPassword) {
        document.getElementById('currentPasswordError').textContent = 'Please enter current password';
        document.getElementById('currentPasswordError').style.display = 'block';
        return;
    }
    
    // Validate new password
    if (newPassword.length < 8) {
        document.getElementById('confirmPasswordError').textContent = 'New password must be at least 8 characters';
        document.getElementById('confirmPasswordError').style.display = 'block';
        return;
    }
    
    // Validate password characters
    if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(newPassword)) {
        document.getElementById('confirmPasswordError').textContent = 'Only Latin letters, numbers and symbols allowed';
        document.getElementById('confirmPasswordError').style.display = 'block';
        return;
    }
    
    // Confirm passwords match
    if (newPassword !== confirmPassword) {
        document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
        document.getElementById('confirmPasswordError').style.display = 'block';
        return;
    }
    
    try {
        showLoader();
        
        // Verify current password and change to new
        const response = await chrome.runtime.sendMessage({
            action: 'changePassword',
            currentPassword,
            newPassword
        });
        
        hideLoader();
        
        if (response.success) {
            showToast('Password changed successfully', 'success');
            showSettingsMain();
        } else {
            document.getElementById('currentPasswordError').textContent = response.error || 'Invalid current password';
            document.getElementById('currentPasswordError').style.display = 'block';
        }
    } catch (error) {
        hideLoader();
        console.error('Error changing password:', error);
        showToast('Failed to change password', 'error');
    }
}

// Show seed phrase screen
function showSeedScreen() {
    document.getElementById('settingsMain').style.display = 'none';
    document.getElementById('settingsSeedScreen').style.display = 'block';
    
    // Reset state
    document.getElementById('settingsSeedPrompt').style.display = 'block';
    document.getElementById('settingsSeedDisplay').style.display = 'none';
    document.getElementById('settingsSeedPasswordInput').value = '';
    document.getElementById('settingsSeedPasswordError').style.display = 'none';
}

// Show seed phrase after password verification
async function showSeedPhrase() {
    const password = document.getElementById('settingsSeedPasswordInput').value;
    
    if (!password) {
        document.getElementById('settingsSeedPasswordError').textContent = 'Please enter your password';
        document.getElementById('settingsSeedPasswordError').style.display = 'block';
        return;
    }
    
    try {
        showLoader();
        
        const response = await chrome.runtime.sendMessage({
            action: 'exportSeedPhrase',
            password
        });
        
        hideLoader();
        
        if (response.success) {
            // Display seed phrase
            const wordsContainer = document.getElementById('settingsSeedWords');
            wordsContainer.innerHTML = '';
            
            response.seedPhrase.split(' ').forEach((word, index) => {
                const wordEl = document.createElement('div');
                wordEl.style.cssText = 'background: var(--bg-tertiary); padding: 8px; border-radius: 6px; font-size: 12px; text-align: center;';
                wordEl.innerHTML = `<span style="color: var(--text-muted); font-size: 10px;">${index + 1}.</span> ${word}`;
                wordsContainer.appendChild(wordEl);
            });
            
            document.getElementById('settingsSeedPrompt').style.display = 'none';
            document.getElementById('settingsSeedDisplay').style.display = 'block';
        } else {
            document.getElementById('settingsSeedPasswordError').textContent = response.error || 'Invalid password';
            document.getElementById('settingsSeedPasswordError').style.display = 'block';
        }
    } catch (error) {
        hideLoader();
        console.error('Error exporting seed:', error);
        showToast('Failed to export seed phrase', 'error');
    }
}

// Copy seed phrase
function copySeedPhrase() {
    const words = [];
    document.querySelectorAll('#settingsSeedWords > div').forEach(el => {
        const text = el.textContent.replace(/^\d+\.\s*/, '');
        words.push(text.trim());
    });
    
    navigator.clipboard.writeText(words.join(' ')).then(() => {
        showToast('Seed phrase copied!', 'success');
    });
}

// Show private key screen
function showKeyScreen() {
    document.getElementById('settingsMain').style.display = 'none';
    document.getElementById('settingsKeyScreen').style.display = 'block';
    
    // Reset state
    document.getElementById('keyPasswordPrompt').style.display = 'block';
    document.getElementById('privateKeyDisplay').style.display = 'none';
    document.getElementById('keyPasswordInput').value = '';
    document.getElementById('keyPasswordError').style.display = 'none';
    
    // Set account name
    document.getElementById('keyAccountName').textContent = currentAccount?.name || 'Account 1';
}

// Show private key after password verification
async function showPrivateKey() {
    const password = document.getElementById('keyPasswordInput').value;
    
    if (!password) {
        document.getElementById('keyPasswordError').textContent = 'Please enter your password';
        document.getElementById('keyPasswordError').style.display = 'block';
        return;
    }
    
    try {
        showLoader();
        
        const response = await chrome.runtime.sendMessage({
            action: 'exportPrivateKey',
            password,
            accountIndex: accounts.indexOf(currentAccount)
        });
        
        hideLoader();
        
        if (response.success) {
            document.getElementById('privateKeyText').textContent = response.privateKey;
            document.getElementById('privateKeyText').style.filter = 'blur(4px)';
            document.getElementById('toggleKeyVisibility').textContent = '👁️';
            
            document.getElementById('keyPasswordPrompt').style.display = 'none';
            document.getElementById('privateKeyDisplay').style.display = 'block';
        } else {
            document.getElementById('keyPasswordError').textContent = 'Invalid password';
            document.getElementById('keyPasswordError').style.display = 'block';
        }
    } catch (error) {
        hideLoader();
        console.error('Error exporting private key:', error);
        showToast('Failed to export private key', 'error');
    }
}

// Toggle private key visibility
function toggleKeyVisibility() {
    const keyText = document.getElementById('privateKeyText');
    const btn = document.getElementById('toggleKeyVisibility');
    
    if (keyText.style.filter === 'blur(4px)') {
        keyText.style.filter = 'none';
        btn.textContent = '🙈';
    } else {
        keyText.style.filter = 'blur(4px)';
        btn.textContent = '👁️';
    }
}

// Copy private key
function copyPrivateKey() {
    const key = document.getElementById('privateKeyText').textContent;
    navigator.clipboard.writeText(key).then(() => {
        showToast('Private key copied!', 'success');
    });
}

// Show reset wallet screen
function showResetScreen() {
    document.getElementById('settingsMain').style.display = 'none';
    document.getElementById('settingsResetScreen').style.display = 'block';
    
    // Reset state
    document.getElementById('resetConfirmInput').value = '';
    document.getElementById('confirmResetBtn').disabled = true;
}

// Reset wallet
async function resetWallet() {
    const confirmText = document.getElementById('resetConfirmInput').value;
    
    if (confirmText !== 'RESET') {
        return;
    }
    
    try {
        showLoader();
        
        // Clear all storage
        await chrome.storage.local.clear();
        await chrome.storage.session.clear();
        
        // Notify service worker
        await chrome.runtime.sendMessage({ action: 'resetWallet' });
        
        hideLoader();
        closeModal('settingsModal');
        
        showToast('Wallet reset successfully', 'success');
        
        // Show setup screen
        setTimeout(() => {
            location.reload();
        }, 1000);
    } catch (error) {
        hideLoader();
        console.error('Error resetting wallet:', error);
        showToast('Failed to reset wallet', 'error');
    }
}

// Clear cache
async function clearCache() {
    try {
        // Clear token price cache
        tokenPricesCache = { prices: {}, lastUpdate: 0 };
        tokenDataCache = { balances: {}, network: null };
        
        // Clear stored cache
        await chrome.storage.local.remove(['tokenPricesCache', 'tokenDataCache', 'transactionCache']);

        showToast('Cache cleared', 'success');
    } catch (error) {
        console.error('Error clearing cache:', error);
        showToast('Failed to clear cache', 'error');
    }
}

