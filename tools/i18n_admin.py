# Erzeugt admin/jsonConfig.json (englische Grundtexte) und admin/i18n/<lang>/translations.json
# Aufruf: python3 tools/i18n_admin.py   (im Adapter-Verzeichnis)
import json, os

LANGS = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn']

# Schlüssel = englischer Text; Werte in der Reihenfolge: de, ru, pt, nl, fr, it, es, pl, uk, zh-cn
T = {

    # Pumpe / Wassermenge
    'Pump': ['Pumpe', 'Насос', 'Bomba', 'Pomp', 'Pompe', 'Pompa', 'Bomba', 'Pompa', 'Насос', '水泵'],
    'Enter the delivery rate of the pump in m³/h. The adapter then calculates the water volume circulated today from the runtimes of the Violet (data point pumpe.umwaelzung_heute, in the pool display behind the runtime). If the absorber or heating reduces the flow, enter the lower value there – empty = same as alone. If both run at the same time, the lower value applies.': [
        'Fördermenge der Pumpe in m³/h eintragen. Der Adapter berechnet daraus mit den Laufzeiten der Violet die heute umgewälzte Wassermenge (Datenpunkt pumpe.umwaelzung_heute, im Pool-Display hinter der Laufzeit). Bremst der Absorber oder die Heizung den Durchfluss, dort den kleineren Wert eintragen – leer = wie allein. Laufen beide gleichzeitig, gilt der kleinere Wert.',
        'Укажите производительность насоса в м³/ч. По времени работы Violet адаптер рассчитает объём воды, прокачанный сегодня (точка данных pumpe.umwaelzung_heute, на дисплее бассейна после времени работы). Если абсорбер или нагрев снижают поток, укажите там меньшее значение – пусто = как без них. Если работают оба, действует меньшее значение.',
        'Introduza o caudal da bomba em m³/h. Com os tempos de funcionamento da Violet, o adaptador calcula o volume de água circulado hoje (ponto de dados pumpe.umwaelzung_heute, no display da piscina após o tempo de funcionamento). Se o absorvedor ou o aquecimento reduzirem o caudal, introduza aí o valor menor – vazio = igual a sozinha. Se ambos funcionarem ao mesmo tempo, aplica-se o valor menor.',
        'Voer het debiet van de pomp in m³/h in. Met de looptijden van de Violet berekent de adapter de vandaag rondgepompte hoeveelheid water (datapunt pumpe.umwaelzung_heute, in het zwembaddisplay achter de looptijd). Remt de absorber of verwarming het debiet af, vul daar de lagere waarde in – leeg = gelijk aan alleen. Lopen beide tegelijk, dan geldt de lagere waarde.',
        "Saisissez le débit de la pompe en m³/h. À partir des durées de fonctionnement de la Violet, l'adaptateur calcule le volume d'eau brassé aujourd'hui (point de données pumpe.umwaelzung_heute, dans l'affichage piscine après la durée). Si l'absorbeur ou le chauffage réduit le débit, saisissez-y la valeur plus faible – vide = comme seule. Si les deux fonctionnent en même temps, la valeur la plus faible s'applique.",
        "Inserire la portata della pompa in m³/h. Con i tempi di funzionamento della Violet l'adattatore calcola il volume d'acqua ricircolato oggi (punto dati pumpe.umwaelzung_heute, nel display piscina dopo il tempo di funzionamento). Se l'assorbitore o il riscaldamento riducono la portata, inserire lì il valore minore – vuoto = come da sola. Se funzionano entrambi, vale il valore minore.",
        'Introduzca el caudal de la bomba en m³/h. Con los tiempos de funcionamiento de la Violet, el adaptador calcula el volumen de agua recirculado hoy (punto de datos pumpe.umwaelzung_heute, en la pantalla de la piscina tras el tiempo de funcionamiento). Si el absorbedor o la calefacción reducen el caudal, introduzca allí el valor menor – vacío = igual que sola. Si ambos funcionan a la vez, se aplica el valor menor.',
        'Podaj wydajność pompy w m³/h. Na podstawie czasów pracy Violet adapter oblicza ilość wody przepompowanej dzisiaj (punkt danych pumpe.umwaelzung_heute, na wyświetlaczu basenu za czasem pracy). Jeśli absorber lub ogrzewanie zmniejszają przepływ, wpisz tam mniejszą wartość – puste = jak sama pompa. Gdy oba działają jednocześnie, obowiązuje mniejsza wartość.',
        'Вкажіть продуктивність насоса в м³/год. За часом роботи Violet адаптер розрахує об’єм води, прокачаний сьогодні (точка даних pumpe.umwaelzung_heute, на дисплеї басейну після часу роботи). Якщо абсорбер або нагрів зменшують потік, вкажіть там менше значення – порожньо = як без них. Якщо працюють обидва, діє менше значення.',
        '输入水泵流量（m³/h）。适配器根据 Violet 的运行时间计算今天循环的水量（数据点 pumpe.umwaelzung_heute，泳池显示屏中显示在运行时间之后）。如果吸热器或加热降低流量，请在此填写较小值——留空 = 与单独运行相同。两者同时运行时取较小值。'],
    'Filter pump – m³/h': ['Filterpumpe – m³/h', 'Фильтрационный насос – м³/ч', 'Bomba de filtração – m³/h', 'Filterpomp – m³/h', 'Pompe de filtration – m³/h', 'Pompa di filtrazione – m³/h', 'Bomba de filtración – m³/h', 'Pompa filtracyjna – m³/h', 'Фільтраційний насос – м³/год', '过滤泵 – m³/h'],
    'Level 1 (ECO) – m³/h': ['Stufe 1 (ECO) – m³/h', 'Ступень 1 (ECO) – м³/ч', 'Nível 1 (ECO) – m³/h', 'Stand 1 (ECO) – m³/h', 'Vitesse 1 (ECO) – m³/h', 'Livello 1 (ECO) – m³/h', 'Nivel 1 (ECO) – m³/h', 'Stopień 1 (ECO) – m³/h', 'Ступінь 1 (ECO) – м³/год', '1 档 (ECO) – m³/h'],
    'Level 2 (Normal) – m³/h': ['Stufe 2 (Normal) – m³/h', 'Ступень 2 (Normal) – м³/ч', 'Nível 2 (Normal) – m³/h', 'Stand 2 (Normal) – m³/h', 'Vitesse 2 (Normal) – m³/h', 'Livello 2 (Normal) – m³/h', 'Nivel 2 (Normal) – m³/h', 'Stopień 2 (Normal) – m³/h', 'Ступінь 2 (Normal) – м³/год', '2 档 (Normal) – m³/h'],
    'Level 3 (Boost) – m³/h': ['Stufe 3 (Boost) – m³/h', 'Ступень 3 (Boost) – м³/ч', 'Nível 3 (Boost) – m³/h', 'Stand 3 (Boost) – m³/h', 'Vitesse 3 (Boost) – m³/h', 'Livello 3 (Boost) – m³/h', 'Nivel 3 (Boost) – m³/h', 'Stopień 3 (Boost) – m³/h', 'Ступінь 3 (Boost) – м³/год', '3 档 (Boost) – m³/h'],
    'with absorber – m³/h': ['mit Absorber – m³/h', 'с абсорбером – м³/ч', 'com absorvedor – m³/h', 'met absorber – m³/h', 'avec absorbeur – m³/h', 'con assorbitore – m³/h', 'con absorbedor – m³/h', 'z absorberem – m³/h', 'з абсорбером – м³/год', '含吸热器 – m³/h'],
    'with heating – m³/h': ['mit Heizung – m³/h', 'с нагревом – м³/ч', 'com aquecimento – m³/h', 'met verwarming – m³/h', 'avec chauffage – m³/h', 'con riscaldamento – m³/h', 'con calefacción – m³/h', 'z ogrzewaniem – m³/h', 'з нагрівом – м³/год', '含加热 – m³/h'],
    # Reiter
    'Connection': ['Verbindung', 'Подключение', 'Conexão', 'Verbinding', 'Connexion', 'Connessione', 'Conexión', 'Połączenie', 'Підключення', '连接'],
    'Functions': ['Funktionen', 'Функции', 'Funções', 'Functies', 'Fonctions', 'Funzioni', 'Funciones', 'Funkcje', 'Функції', '功能'],
    'Temperatures': ['Temperaturen', 'Температуры', 'Temperaturas', 'Temperaturen', 'Températures', 'Temperature', 'Temperaturas', 'Temperatury', 'Температури', '温度'],
    'Analog': ['Analog', 'Аналоговые', 'Analógico', 'Analoog', 'Analogique', 'Analogico', 'Analógico', 'Analogowe', 'Аналогові', '模拟量'],
    'Relays': ['Relais', 'Реле', 'Relés', 'Relais', 'Relais', 'Relè', 'Relés', 'Przekaźniki', 'Реле', '继电器'],

    # Verbindung
    'IP address or host name of the Violet': ['IP-Adresse oder Hostname der Violet', 'IP-адрес или имя хоста Violet', 'Endereço IP ou nome do host da Violet', 'IP-adres of hostnaam van de Violet', "Adresse IP ou nom d'hôte de la Violet", 'Indirizzo IP o nome host della Violet', 'Dirección IP o nombre de host de la Violet', 'Adres IP lub nazwa hosta Violet', 'IP-адреса або ім’я хоста Violet', 'Violet 的 IP 地址或主机名'],
    'e.g. 10.10.3.50 or 10.10.3.50:8080 (without http://)': ['z. B. 10.10.3.50 oder 10.10.3.50:8080 (ohne http://)', 'например 10.10.3.50 или 10.10.3.50:8080 (без http://)', 'p. ex. 10.10.3.50 ou 10.10.3.50:8080 (sem http://)', 'bijv. 10.10.3.50 of 10.10.3.50:8080 (zonder http://)', 'p. ex. 10.10.3.50 ou 10.10.3.50:8080 (sans http://)', 'ad es. 10.10.3.50 o 10.10.3.50:8080 (senza http://)', 'p. ej. 10.10.3.50 o 10.10.3.50:8080 (sin http://)', 'np. 10.10.3.50 lub 10.10.3.50:8080 (bez http://)', 'напр. 10.10.3.50 або 10.10.3.50:8080 (без http://)', '例如 10.10.3.50 或 10.10.3.50:8080（不带 http://）'],
    'User name': ['Benutzername', 'Имя пользователя', 'Nome de usuário', 'Gebruikersnaam', "Nom d'utilisateur", 'Nome utente', 'Nombre de usuario', 'Nazwa użytkownika', 'Ім’я користувача', '用户名'],
    'Login of the Violet web interface (usually not needed for reading only)': ['Login der Violet-Weboberfläche (für reines Lesen meist nicht nötig)', 'Логин веб-интерфейса Violet (для чтения обычно не нужен)', 'Login da interface web da Violet (geralmente não necessário apenas para leitura)', 'Login van de Violet-webinterface (voor alleen lezen meestal niet nodig)', "Identifiant de l'interface web Violet (généralement inutile pour la lecture seule)", "Login dell'interfaccia web Violet (di solito non necessario per la sola lettura)", 'Inicio de sesión de la interfaz web de Violet (normalmente no necesario solo para lectura)', 'Login interfejsu WWW Violet (zwykle niepotrzebny przy samym odczycie)', 'Логін вебінтерфейсу Violet (для читання зазвичай не потрібен)', 'Violet 网页界面登录名（仅读取时通常不需要）'],
    'Password': ['Passwort', 'Пароль', 'Senha', 'Wachtwoord', 'Mot de passe', 'Password', 'Contraseña', 'Hasło', 'Пароль', '密码'],
    'Polling interval (seconds)': ['Abfrageintervall (Sekunden)', 'Интервал опроса (секунды)', 'Intervalo de consulta (segundos)', 'Pollinterval (seconden)', "Intervalle d'interrogation (secondes)", 'Intervallo di interrogazione (secondi)', 'Intervalo de consulta (segundos)', 'Interwał odpytywania (sekundy)', 'Інтервал опитування (секунди)', '轮询间隔（秒）'],
    'Timeout per request (seconds)': ['Zeitlimit pro Abfrage (Sekunden)', 'Таймаут запроса (секунды)', 'Tempo limite por consulta (segundos)', 'Time-out per verzoek (seconden)', 'Délai par requête (secondes)', 'Timeout per richiesta (secondi)', 'Tiempo límite por consulta (segundos)', 'Limit czasu zapytania (sekundy)', 'Тайм-аут запиту (секунди)', '每次请求超时（秒）'],
    'Switching from ioBroker': ['Schalten aus ioBroker', 'Переключение из ioBroker', 'Comutação a partir do ioBroker', 'Schakelen vanuit ioBroker', 'Commutation depuis ioBroker', 'Commutazione da ioBroker', 'Conmutación desde ioBroker', 'Przełączanie z ioBroker', 'Перемикання з ioBroker', '从 ioBroker 切换'],
    'Allow switching (ON / OFF / AUTO)': ['Schalten erlauben (EIN / AUS / AUTO)', 'Разрешить переключение (ВКЛ / ВЫКЛ / АВТО)', 'Permitir comutação (LIGA / DESLIGA / AUTO)', 'Schakelen toestaan (AAN / UIT / AUTO)', 'Autoriser la commutation (MARCHE / ARRÊT / AUTO)', 'Consenti commutazione (ON / OFF / AUTO)', 'Permitir conmutación (ENC. / APAG. / AUTO)', 'Zezwól na przełączanie (WŁ / WYŁ / AUTO)', 'Дозволити перемикання (УВІМК / ВИМК / АВТО)', '允许切换（开 / 关 / 自动）'],
    'Creates a data point "schalten" for each function. Dosing, cover and Violet settings are deliberately not switchable.': ['Legt pro Funktion einen Datenpunkt „schalten“ an. Dosierung, Abdeckung und Einstellungen der Violet sind bewusst nicht schaltbar.', 'Создаёт для каждой функции точку данных «schalten». Дозирование, накрытие и настройки Violet намеренно не переключаются.', 'Cria um ponto de dados "schalten" para cada função. Dosagem, cobertura e configurações da Violet não são comutáveis de propósito.', 'Maakt per functie een datapunt "schalten" aan. Dosering, afdekking en Violet-instellingen zijn bewust niet schakelbaar.', 'Crée un point de données « schalten » par fonction. Le dosage, la couverture et les réglages de la Violet ne sont volontairement pas commutables.', 'Crea un punto dati "schalten" per ogni funzione. Dosaggio, copertura e impostazioni della Violet volutamente non commutabili.', 'Crea un punto de datos "schalten" por función. La dosificación, la cubierta y los ajustes de la Violet no son conmutables a propósito.', 'Tworzy punkt danych „schalten” dla każdej funkcji. Dozowanie, przykrycie i ustawienia Violet celowo nie są przełączalne.', 'Створює для кожної функції точку даних «schalten». Дозування, накриття та налаштування Violet навмисно не перемикаються.', '为每个功能创建数据点 "schalten"。加药、泳池盖和 Violet 设置有意不可切换。'],
    'Duration for manual ON/OFF (minutes)': ['Dauer bei manuell EIN/AUS (Minuten)', 'Длительность ручного ВКЛ/ВЫКЛ (минуты)', 'Duração do LIGA/DESLIGA manual (minutos)', 'Duur bij handmatig AAN/UIT (minuten)', 'Durée en MARCHE/ARRÊT manuel (minutes)', 'Durata ON/OFF manuale (minuti)', 'Duración de ENC./APAG. manual (minutos)', 'Czas ręcznego WŁ/WYŁ (minuty)', 'Тривалість ручного УВІМК/ВИМК (хвилини)', '手动开/关持续时间（分钟）'],
    '0 = permanently, until switched back to AUTO': ['0 = dauerhaft, bis wieder auf AUTO geschaltet wird', '0 = постоянно, до возврата в АВТО', '0 = permanente, até voltar para AUTO', '0 = permanent, tot terug naar AUTO geschakeld', "0 = en permanence, jusqu'au retour en AUTO", '0 = permanente, fino al ritorno in AUTO', '0 = permanente, hasta volver a AUTO', '0 = na stałe, do przełączenia z powrotem na AUTO', '0 = постійно, до повернення в АВТО', '0 = 永久，直到切回自动'],
    'User name and password of the Violet are usually required for switching. Not switchable: dosing, cover, settings.': ['Zum Schalten werden meist Benutzername und Passwort der Violet benötigt. Nicht schaltbar: Dosierung, Abdeckung, Einstellungen.', 'Для переключения обычно нужны имя пользователя и пароль Violet. Не переключаются: дозирование, накрытие, настройки.', 'Para comutar, normalmente são necessários usuário e senha da Violet. Não comutáveis: dosagem, cobertura, configurações.', 'Voor schakelen zijn meestal gebruikersnaam en wachtwoord van de Violet nodig. Niet schakelbaar: dosering, afdekking, instellingen.', "La commutation nécessite généralement l'identifiant et le mot de passe de la Violet. Non commutables : dosage, couverture, réglages.", 'Per la commutazione servono di solito nome utente e password della Violet. Non commutabili: dosaggio, copertura, impostazioni.', 'Para conmutar se necesitan normalmente usuario y contraseña de la Violet. No conmutables: dosificación, cubierta, ajustes.', 'Do przełączania zwykle potrzebne są nazwa użytkownika i hasło Violet. Nieprzełączalne: dozowanie, przykrycie, ustawienia.', 'Для перемикання зазвичай потрібні ім’я користувача та пароль Violet. Не перемикаються: дозування, накриття, налаштування.', '切换通常需要 Violet 的用户名和密码。不可切换：加药、泳池盖、设置。'],
    'Pool display': ['Pool-Display', 'Дисплей бассейна', 'Display da piscina', 'Zwembaddisplay', 'Affichage piscine', 'Display piscina', 'Pantalla de piscina', 'Wyświetlacz basenu', 'Дисплей басейну', '泳池显示屏'],
    'Provide pool display': ['Pool-Display bereitstellen', 'Включить дисплей бассейна', 'Disponibilizar display da piscina', 'Zwembaddisplay aanbieden', "Fournir l'affichage piscine", 'Fornisci display piscina', 'Proporcionar pantalla de piscina', 'Udostępnij wyświetlacz basenu', 'Надати дисплей басейну', '提供泳池显示屏'],
    'Built-in web server: http://<ioBroker-IP>:<port>/ – use only in your home network, do not expose to the internet': ['Eingebauter Webserver: http://<ioBroker-IP>:<Port>/ – nur im eigenen Netz verwenden, nicht ins Internet freigeben', 'Встроенный веб-сервер: http://<ioBroker-IP>:<порт>/ – только в домашней сети, не открывать в интернет', 'Servidor web integrado: http://<ioBroker-IP>:<porta>/ – use apenas na rede doméstica, não exponha à internet', 'Ingebouwde webserver: http://<ioBroker-IP>:<poort>/ – alleen in het thuisnetwerk gebruiken, niet openstellen naar internet', "Serveur web intégré : http://<IP-ioBroker>:<port>/ – à utiliser uniquement sur le réseau local, ne pas exposer sur Internet", 'Server web integrato: http://<IP-ioBroker>:<porta>/ – usare solo nella rete domestica, non esporre su Internet', 'Servidor web integrado: http://<IP-ioBroker>:<puerto>/ – usar solo en la red doméstica, no exponer a Internet', 'Wbudowany serwer WWW: http://<IP-ioBroker>:<port>/ – tylko w sieci domowej, nie udostępniać w internecie', 'Вбудований вебсервер: http://<IP-ioBroker>:<порт>/ – лише в домашній мережі, не відкривати в інтернет', '内置 Web 服务器：http://<ioBroker-IP>:<端口>/ – 仅在家庭网络中使用，不要暴露到互联网'],
    'Port': ['Port', 'Порт', 'Porta', 'Poort', 'Port', 'Porta', 'Puerto', 'Port', 'Порт', '端口'],
    'Font of the pool display': ['Schriftart des Pool-Displays', 'Шрифт дисплея бассейна', 'Fonte do display da piscina', 'Lettertype van het zwembaddisplay', "Police de l'affichage piscine", 'Carattere del display piscina', 'Fuente de la pantalla de piscina', 'Czcionka wyświetlacza basenu', 'Шрифт дисплея басейну', '泳池显示屏字体'],
    'Verdana (classic)': ['Verdana (klassisch)', 'Verdana (классический)', 'Verdana (clássica)', 'Verdana (klassiek)', 'Verdana (classique)', 'Verdana (classico)', 'Verdana (clásica)', 'Verdana (klasyczna)', 'Verdana (класичний)', 'Verdana（经典）'],
    'Arial': ['Arial', 'Arial', 'Arial', 'Arial', 'Arial', 'Arial', 'Arial', 'Arial', 'Arial', 'Arial'],
    'System font': ['Systemschrift', 'Системный шрифт', 'Fonte do sistema', 'Systeemlettertype', 'Police système', 'Carattere di sistema', 'Fuente del sistema', 'Czcionka systemowa', 'Системний шрифт', '系统字体'],
    'Address: http://<ioBroker-IP>:<port>/ – switches in the pool display only if "Allow switching" is enabled. Use only in your home network.': ['Aufruf: http://<ioBroker-IP>:<Port>/ – Schalter im Pool-Display nur, wenn „Schalten erlauben“ aktiv ist. Nur im Heimnetz nutzen.', 'Адрес: http://<ioBroker-IP>:<порт>/ – переключатели на дисплее только при включённом «Разрешить переключение». Только в домашней сети.', 'Endereço: http://<ioBroker-IP>:<porta>/ – botões no display apenas se "Permitir comutação" estiver ativo. Use só na rede doméstica.', 'Adres: http://<ioBroker-IP>:<poort>/ – schakelaars in het display alleen als "Schakelen toestaan" actief is. Alleen in het thuisnetwerk gebruiken.', "Adresse : http://<IP-ioBroker>:<port>/ – boutons dans l'affichage seulement si « Autoriser la commutation » est activé. Uniquement sur le réseau local.", 'Indirizzo: http://<IP-ioBroker>:<porta>/ – interruttori nel display solo se "Consenti commutazione" è attivo. Solo nella rete domestica.', 'Dirección: http://<IP-ioBroker>:<puerto>/ – interruptores en la pantalla solo si "Permitir conmutación" está activo. Solo en la red doméstica.', 'Adres: http://<IP-ioBroker>:<port>/ – przełączniki na wyświetlaczu tylko przy włączonym „Zezwól na przełączanie”. Tylko w sieci domowej.', 'Адреса: http://<IP-ioBroker>:<порт>/ – перемикачі на дисплеї лише якщо «Дозволити перемикання» увімкнено. Лише в домашній мережі.', '地址：http://<ioBroker-IP>:<端口>/ – 仅当启用"允许切换"时显示屏上才有开关。仅在家庭网络中使用。'],

    # Funktionen
    'What do you use on your Violet? Only checked areas are created as data points.': ['Was nutzen Sie an Ihrer Violet? Nur angehakte Bereiche werden als Datenpunkte angelegt.', 'Что вы используете на Violet? Точки данных создаются только для отмеченных областей.', 'O que você usa na sua Violet? Apenas as áreas marcadas são criadas como pontos de dados.', 'Wat gebruikt u op uw Violet? Alleen aangevinkte onderdelen worden als datapunten aangemaakt.', 'Qu’utilisez-vous sur votre Violet ? Seules les zones cochées sont créées comme points de données.', 'Cosa usate sulla vostra Violet? Vengono creati punti dati solo per le aree selezionate.', '¿Qué usa en su Violet? Solo se crean puntos de datos para las áreas marcadas.', 'Czego używasz w Violet? Punkty danych są tworzone tylko dla zaznaczonych obszarów.', 'Що ви використовуєте на Violet? Точки даних створюються лише для позначених розділів.', '您在 Violet 上使用哪些功能？只有勾选的部分会创建数据点。'],
    'Water and filtration': ['Wasser und Filterung', 'Вода и фильтрация', 'Água e filtragem', 'Water en filtering', 'Eau et filtration', 'Acqua e filtrazione', 'Agua y filtración', 'Woda i filtracja', 'Вода та фільтрація', '水与过滤'],
    'Water values (pH, redox, chlorine)': ['Wasserwerte (pH, Redox, Chlor)', 'Параметры воды (pH, редокс, хлор)', 'Valores da água (pH, redox, cloro)', 'Waterwaarden (pH, redox, chloor)', "Valeurs de l'eau (pH, redox, chlore)", "Valori dell'acqua (pH, redox, cloro)", 'Valores del agua (pH, redox, cloro)', 'Parametry wody (pH, redoks, chlor)', 'Показники води (pH, редокс, хлор)', '水质（pH、氧化还原、氯）'],
    'Filter pump': ['Filterpumpe', 'Фильтрационный насос', 'Bomba de filtro', 'Filterpomp', 'Pompe de filtration', 'Pompa di filtrazione', 'Bomba de filtración', 'Pompa filtracyjna', 'Фільтраційний насос', '过滤泵'],
    'Pump with speed levels': ['Pumpe mit Drehzahlstufen', 'Насос со ступенями скорости', 'Bomba com níveis de velocidade', 'Pomp met toerentalstanden', 'Pompe à vitesses', 'Pompa con livelli di velocità', 'Bomba con niveles de velocidad', 'Pompa ze stopniami prędkości', 'Насос зі ступенями швидкості', '多档速泵'],
    'Only for speed-controlled pumps with levels 0–3': ['Nur bei drehzahlgeregelter Pumpe mit Stufen 0–3', 'Только для насосов с регулировкой скорости, ступени 0–3', 'Apenas para bombas com controle de velocidade, níveis 0–3', 'Alleen voor toerentalgeregelde pompen met standen 0–3', 'Uniquement pour pompes à vitesse variable, niveaux 0–3', 'Solo per pompe a velocità variabile con livelli 0–3', 'Solo para bombas de velocidad variable con niveles 0–3', 'Tylko dla pomp z regulacją prędkości, stopnie 0–3', 'Лише для насосів з регулюванням швидкості, ступені 0–3', '仅适用于具有 0–3 档的调速泵'],
    'Automatic backwash': ['Automatische Rückspülung', 'Автоматическая обратная промывка', 'Retrolavagem automática', 'Automatisch terugspoelen', 'Contre-lavage automatique', 'Controlavaggio automatico', 'Contralavado automático', 'Automatyczne płukanie wsteczne', 'Автоматичне зворотне промивання', '自动反冲洗'],
    'Refill / water level': ['Nachspeisung / Füllstand', 'Подпитка / уровень воды', 'Reabastecimento / nível de água', 'Bijvullen / waterpeil', "Appoint d'eau / niveau", "Rabbocco / livello dell'acqua", 'Rellenado / nivel de agua', 'Uzupełnianie / poziom wody', 'Підживлення / рівень води', '补水 / 水位'],
    'Dosing – which channels are in operation?': ['Dosierung – welche Kanäle sind in Betrieb?', 'Дозирование – какие каналы используются?', 'Dosagem – quais canais estão em uso?', 'Dosering – welke kanalen zijn in gebruik?', 'Dosage – quels canaux sont utilisés ?', 'Dosaggio – quali canali sono in uso?', 'Dosificación – ¿qué canales están en uso?', 'Dozowanie – które kanały są używane?', 'Дозування – які канали використовуються?', '加药 – 哪些通道在使用？'],
    'Chlorine (liquid)': ['Chlor (flüssig)', 'Хлор (жидкий)', 'Cloro (líquido)', 'Chloor (vloeibaar)', 'Chlore (liquide)', 'Cloro (liquido)', 'Cloro (líquido)', 'Chlor (płynny)', 'Хлор (рідкий)', '氯（液体）'],
    'Electrolysis (salt)': ['Elektrolyse (Salz)', 'Электролиз (соль)', 'Eletrólise (sal)', 'Elektrolyse (zout)', 'Électrolyse (sel)', 'Elettrolisi (sale)', 'Electrólisis (sal)', 'Elektroliza (sól)', 'Електроліз (сіль)', '电解（盐）'],
    'pH minus': ['pH-minus', 'pH-минус', 'pH menos', 'pH-min', 'pH moins', 'pH meno', 'pH menos', 'pH minus', 'pH-мінус', 'pH 降'],
    'pH plus': ['pH-plus', 'pH-плюс', 'pH mais', 'pH-plus', 'pH plus', 'pH più', 'pH más', 'pH plus', 'pH-плюс', 'pH 升'],
    'Flocculant': ['Flockung', 'Флокулянт', 'Floculante', 'Vlokmiddel', 'Floculant', 'Flocculante', 'Floculante', 'Flokulant', 'Флокулянт', '絮凝剂'],
    'Heating, light and accessories': ['Heizen, Licht und Zubehör', 'Нагрев, свет и аксессуары', 'Aquecimento, luz e acessórios', 'Verwarming, licht en accessoires', 'Chauffage, éclairage et accessoires', 'Riscaldamento, luce e accessori', 'Calefacción, luz y accesorios', 'Ogrzewanie, światło i akcesoria', 'Нагрів, світло та аксесуари', '加热、灯光与配件'],
    'Heating / heat pump': ['Heizung / Wärmepumpe', 'Нагрев / тепловой насос', 'Aquecimento / bomba de calor', 'Verwarming / warmtepomp', 'Chauffage / pompe à chaleur', 'Riscaldamento / pompa di calore', 'Calefacción / bomba de calor', 'Ogrzewanie / pompa ciepła', 'Нагрів / тепловий насос', '加热 / 热泵'],
    'Solar heating': ['Solarheizung', 'Солнечный нагрев', 'Aquecimento solar', 'Zonneverwarming', 'Chauffage solaire', 'Riscaldamento solare', 'Calefacción solar', 'Ogrzewanie słoneczne', 'Сонячний нагрів', '太阳能加热'],
    'PV surplus mode': ['PV-Überschuss-Modus', 'Режим избытка PV', 'Modo de excedente FV', 'PV-overschotmodus', 'Mode surplus PV', 'Modalità surplus FV', 'Modo de excedente FV', 'Tryb nadwyżki PV', 'Режим надлишку PV', '光伏余电模式'],
    'Pool lighting': ['Poolbeleuchtung', 'Освещение бассейна', 'Iluminação da piscina', 'Zwembadverlichting', 'Éclairage de la piscine', 'Illuminazione piscina', 'Iluminación de la piscina', 'Oświetlenie basenu', 'Освітлення басейну', '泳池照明'],
    'DMX light scenes': ['DMX-Lichtszenen', 'Световые сцены DMX', 'Cenas de luz DMX', 'DMX-lichtscènes', "Scènes lumineuses DMX", 'Scene luci DMX', 'Escenas de luz DMX', 'Sceny świetlne DMX', 'Світлові сцени DMX', 'DMX 灯光场景'],
    'Pool cover': ['Poolabdeckung', 'Накрытие бассейна', 'Cobertura da piscina', 'Zwembadafdekking', 'Couverture de piscine', 'Copertura piscina', 'Cubierta de la piscina', 'Przykrycie basenu', 'Накриття басейну', '泳池盖'],
    'ECO mode': ['ECO-Modus', 'Режим ECO', 'Modo ECO', 'ECO-modus', 'Mode ECO', 'Modalità ECO', 'Modo ECO', 'Tryb ECO', 'Режим ECO', 'ECO 模式'],
    'Extensions and inputs': ['Erweiterungen und Eingänge', 'Расширения и входы', 'Extensões e entradas', 'Uitbreidingen en ingangen', 'Extensions et entrées', 'Espansioni e ingressi', 'Extensiones y entradas', 'Rozszerzenia i wejścia', 'Розширення та входи', '扩展与输入'],
    'Relay extension 1': ['Relaiserweiterung 1', 'Релейное расширение 1', 'Extensão de relés 1', 'Relaisuitbreiding 1', 'Extension relais 1', 'Espansione relè 1', 'Extensión de relés 1', 'Rozszerzenie przekaźników 1', 'Релейне розширення 1', '继电器扩展 1'],
    'Relay extension 2': ['Relaiserweiterung 2', 'Релейное расширение 2', 'Extensão de relés 2', 'Relaisuitbreiding 2', 'Extension relais 2', 'Espansione relè 2', 'Extensión de relés 2', 'Rozszerzenie przekaźników 2', 'Релейне розширення 2', '继电器扩展 2'],
    'Relay names in the tab "Relays"': ['Namen der Relais im Reiter „Relais“', 'Имена реле на вкладке «Реле»', 'Nomes dos relés na aba "Relés"', 'Relaisnamen op het tabblad "Relais"', "Noms des relais dans l'onglet « Relais »", 'Nomi dei relè nella scheda "Relè"', 'Nombres de los relés en la pestaña "Relés"', 'Nazwy przekaźników na karcie „Przekaźniki”', 'Назви реле на вкладці «Реле»', '继电器名称在"继电器"选项卡中'],
    'Temperature sensors': ['Temperatursensoren', 'Датчики температуры', 'Sensores de temperatura', 'Temperatuursensoren', 'Capteurs de température', 'Sensori di temperatura', 'Sensores de temperatura', 'Czujniki temperatury', 'Датчики температури', '温度传感器'],
    'Sensors that are not connected are omitted automatically; names in the tab "Temperatures"': ['Nicht angeschlossene Sensoren werden automatisch weggelassen; Namen im Reiter „Temperaturen“', 'Неподключённые датчики пропускаются автоматически; имена на вкладке «Температуры»', 'Sensores não conectados são omitidos automaticamente; nomes na aba "Temperaturas"', 'Niet aangesloten sensoren worden automatisch weggelaten; namen op het tabblad "Temperaturen"', "Les capteurs non raccordés sont ignorés automatiquement ; noms dans l'onglet « Températures »", 'I sensori non collegati vengono omessi automaticamente; nomi nella scheda "Temperature"', 'Los sensores no conectados se omiten automáticamente; nombres en la pestaña "Temperaturas"', 'Niepodłączone czujniki są pomijane automatycznie; nazwy na karcie „Temperatury”', 'Непідключені датчики пропускаються автоматично; назви на вкладці «Температури»', '未连接的传感器会自动忽略；名称在"温度"选项卡中'],
    'Digital inputs': ['Digitaleingänge', 'Цифровые входы', 'Entradas digitais', 'Digitale ingangen', 'Entrées numériques', 'Ingressi digitali', 'Entradas digitales', 'Wejścia cyfrowe', 'Цифрові входи', '数字输入'],
    'Analog / pulse inputs': ['Analog-/Impulseingänge', 'Аналоговые / импульсные входы', 'Entradas analógicas / de pulso', 'Analoge / pulsingangen', 'Entrées analogiques / impulsions', 'Ingressi analogici / a impulsi', 'Entradas analógicas / de pulsos', 'Wejścia analogowe / impulsowe', 'Аналогові / імпульсні входи', '模拟 / 脉冲输入'],
    'e.g. filter pressure, humidity, probe flow – names and units in the tab "Analog"': ['z. B. Filterdruck, Luftfeuchte, Sonden-Anströmung – Namen und Einheiten im Reiter „Analog“', 'например давление фильтра, влажность, поток через зонд – имена и единицы на вкладке «Аналоговые»', 'p. ex. pressão do filtro, umidade, fluxo da sonda – nomes e unidades na aba "Analógico"', 'bijv. filterdruk, luchtvochtigheid, sondedoorstroming – namen en eenheden op het tabblad "Analoog"', "p. ex. pression du filtre, humidité, débit de sonde – noms et unités dans l'onglet « Analogique »", 'ad es. pressione del filtro, umidità, flusso sonda – nomi e unità nella scheda "Analogico"', 'p. ej. presión del filtro, humedad, flujo de sonda – nombres y unidades en la pestaña "Analógico"', 'np. ciśnienie filtra, wilgotność, przepływ sondy – nazwy i jednostki na karcie „Analogowe”', 'напр. тиск фільтра, вологість, потік через зонд – назви та одиниці на вкладці «Аналогові»', '例如过滤器压力、湿度、探头流量 – 名称和单位在"模拟量"选项卡中'],
    'Scope of data': ['Umfang der Daten', 'Объём данных', 'Escopo dos dados', 'Omvang van de gegevens', 'Étendue des données', 'Ambito dei dati', 'Alcance de los datos', 'Zakres danych', 'Обсяг даних', '数据范围'],
    'Daily min/max of measured values': ['Tages-Min/Max der Messwerte', 'Суточные мин/макс измерений', 'Mín/máx diário dos valores medidos', 'Dagelijks min/max van meetwaarden', 'Min/max journaliers des mesures', 'Min/max giornalieri dei valori misurati', 'Mín/máx diario de los valores medidos', 'Dzienne min/maks pomiarów', 'Добові мін/макс вимірювань', '测量值每日最小/最大'],
    'Switching times and runtimes': ['Schaltzeiten und Laufzeiten', 'Время переключений и наработка', 'Horários de comutação e tempos de funcionamento', 'Schakeltijden en looptijden', 'Heures de commutation et durées de fonctionnement', 'Orari di commutazione e tempi di funzionamento', 'Horas de conmutación y tiempos de funcionamiento', 'Czasy przełączeń i czasy pracy', 'Час перемикань і напрацювання', '切换时间与运行时间'],
    'Creates 3 additional data points per function': ['Erzeugt pro Funktion 3 zusätzliche Datenpunkte', 'Создаёт 3 дополнительные точки данных на функцию', 'Cria 3 pontos de dados adicionais por função', 'Maakt per functie 3 extra datapunten aan', 'Crée 3 points de données supplémentaires par fonction', 'Crea 3 punti dati aggiuntivi per funzione', 'Crea 3 puntos de datos adicionales por función', 'Tworzy 3 dodatkowe punkty danych na funkcję', 'Створює 3 додаткові точки даних на функцію', '每个功能额外创建 3 个数据点'],
    'System information of the Violet': ['Systeminfos der Violet', 'Системная информация Violet', 'Informações do sistema da Violet', 'Systeeminformatie van de Violet', 'Informations système de la Violet', 'Informazioni di sistema della Violet', 'Información del sistema de la Violet', 'Informacje systemowe Violet', 'Системна інформація Violet', 'Violet 系统信息'],
    'Diagnostics (fault counters)': ['Diagnose (Fehlerzähler)', 'Диагностика (счётчики ошибок)', 'Diagnóstico (contadores de falhas)', 'Diagnose (foutentellers)', 'Diagnostic (compteurs de défauts)', 'Diagnostica (contatori di errori)', 'Diagnóstico (contadores de fallos)', 'Diagnostyka (liczniki błędów)', 'Діагностика (лічильники помилок)', '诊断（故障计数）'],
    'Violet messages (warnings, alarms, reminders)': ['Meldungen der Violet (Warnungen, Alarme, Erinnerungen)', 'Сообщения Violet (предупреждения, тревоги, напоминания)', 'Mensagens da Violet (avisos, alarmes, lembretes)', 'Meldingen van de Violet (waarschuwingen, alarmen, herinneringen)', 'Messages de la Violet (avertissements, alarmes, rappels)', 'Messaggi della Violet (avvisi, allarmi, promemoria)', 'Mensajes de la Violet (avisos, alarmas, recordatorios)', 'Komunikaty Violet (ostrzeżenia, alarmy, przypomnienia)', 'Повідомлення Violet (попередження, тривоги, нагадування)', 'Violet 消息（警告、报警、提醒）'],
    'Data point meldungen.aktiv and notice in the pool display; acknowledging only affects ioBroker': ['Datenpunkt meldungen.aktiv und Hinweis im Pool-Display; Quittieren wirkt nur in ioBroker', 'Точка данных meldungen.aktiv и уведомление на дисплее; подтверждение действует только в ioBroker', 'Ponto de dados meldungen.aktiv e aviso no display; confirmar afeta apenas o ioBroker', 'Datapunt meldungen.aktiv en melding in het display; bevestigen werkt alleen in ioBroker', "Point de données meldungen.aktiv et indication dans l'affichage ; l'acquittement n'agit que dans ioBroker", 'Punto dati meldungen.aktiv e avviso nel display; la conferma vale solo in ioBroker', 'Punto de datos meldungen.aktiv y aviso en la pantalla; confirmar solo afecta a ioBroker', 'Punkt danych meldungen.aktiv i informacja na wyświetlaczu; potwierdzenie działa tylko w ioBroker', 'Точка даних meldungen.aktiv і сповіщення на дисплеї; підтвердження діє лише в ioBroker', '数据点 meldungen.aktiv 及显示屏提示；确认仅在 ioBroker 中生效'],

    # Temperaturen
    'Sensors 1–6 are permanently assigned in the Violet and are named automatically as there (own name optional). From sensor 7 freely nameable. The current value is shown next to each field.': ['Sensor 1–6 sind in der Violet fest belegt und heißen automatisch wie dort (eigener Name optional). Ab Sensor 7 frei benennbar. Neben jedem Feld steht der aktuelle Messwert.', 'Датчики 1–6 жёстко назначены в Violet и называются автоматически как там (своё имя по желанию). С датчика 7 имена свободные. Рядом с полем показано текущее значение.', 'Os sensores 1–6 são fixos na Violet e recebem automaticamente o nome de lá (nome próprio opcional). A partir do sensor 7, nome livre. O valor atual aparece ao lado de cada campo.', 'Sensoren 1–6 zijn in de Violet vast toegewezen en krijgen automatisch die naam (eigen naam optioneel). Vanaf sensor 7 vrij te benoemen. Naast elk veld staat de actuele waarde.', 'Les capteurs 1 à 6 sont attribués de façon fixe dans la Violet et portent automatiquement le même nom (nom personnalisé facultatif). À partir du capteur 7, nom libre. La valeur actuelle est affichée à côté de chaque champ.', 'I sensori 1–6 sono assegnati in modo fisso nella Violet e prendono automaticamente quel nome (nome proprio opzionale). Dal sensore 7 nome libero. Accanto a ogni campo è mostrato il valore attuale.', 'Los sensores 1–6 están asignados de forma fija en la Violet y toman automáticamente ese nombre (nombre propio opcional). Desde el sensor 7, nombre libre. Junto a cada campo se muestra el valor actual.', 'Czujniki 1–6 są na stałe przypisane w Violet i automatycznie mają tamtejsze nazwy (własna nazwa opcjonalnie). Od czujnika 7 dowolne nazwy. Obok każdego pola widać bieżącą wartość.', 'Датчики 1–6 жорстко призначені у Violet і автоматично мають ті самі назви (власна назва за бажанням). З датчика 7 назви довільні. Поруч із полем показано поточне значення.', '传感器 1–6 在 Violet 中固定分配，并自动采用其名称（可选自定义名称）。从传感器 7 起可自由命名。每个字段旁显示当前值。'],
    'Water temperature': ['Wassertemperatur', 'Температура воды', 'Temperatura da água', 'Watertemperatuur', "Température de l'eau", "Temperatura dell'acqua", 'Temperatura del agua', 'Temperatura wody', 'Температура води', '水温'],
    'Outside temperature': ['Außentemperatur', 'Наружная температура', 'Temperatura externa', 'Buitentemperatuur', 'Température extérieure', 'Temperatura esterna', 'Temperatura exterior', 'Temperatura zewnętrzna', 'Зовнішня температура', '室外温度'],
    'Absorber temperature': ['Absorbertemperatur', 'Температура абсорбера', 'Temperatura do absorvedor', 'Absorbertemperatuur', "Température de l'absorbeur", "Temperatura dell'assorbitore", 'Temperatura del absorbedor', 'Temperatura absorbera', 'Температура абсорбера', '吸热器温度'],
    'Absorber return': ['Absorber-Rücklauf', 'Обратка абсорбера', 'Retorno do absorvedor', 'Absorber-retour', "Retour de l'absorbeur", "Ritorno dell'assorbitore", 'Retorno del absorbedor', 'Powrót absorbera', 'Зворотна лінія абсорбера', '吸热器回水'],
    'Heat exchanger': ['Wärmetauscher', 'Теплообменник', 'Trocador de calor', 'Warmtewisselaar', 'Échangeur de chaleur', 'Scambiatore di calore', 'Intercambiador de calor', 'Wymiennik ciepła', 'Теплообмінник', '热交换器'],
    'Storage temperature': ['Speichertemperatur', 'Температура накопителя', 'Temperatura do reservatório', 'Buffertemperatuur', 'Température du ballon', 'Temperatura accumulo', 'Temperatura del acumulador', 'Temperatura zasobnika', 'Температура накопичувача', '储罐温度'],

    # Analog
    'The Violet has fixed inputs (see labels). Only inputs with a name are created as data points; empty unit = suggestion in grey. The live value helps with the assignment.': ['Die Violet hat feste Eingänge (siehe Beschriftung). Nur Eingänge mit Namen werden als Datenpunkte angelegt; leere Einheit = Vorschlag in grau. Der Live-Wert hilft bei der Zuordnung.', 'У Violet фиксированные входы (см. подписи). Точки данных создаются только для входов с именем; пустая единица = серая подсказка. Текущее значение помогает сопоставить.', 'A Violet tem entradas fixas (ver rótulos). Apenas entradas com nome viram pontos de dados; unidade vazia = sugestão em cinza. O valor ao vivo ajuda na atribuição.', 'De Violet heeft vaste ingangen (zie labels). Alleen ingangen met een naam worden datapunten; lege eenheid = suggestie in grijs. De live-waarde helpt bij de toewijzing.', "La Violet possède des entrées fixes (voir les libellés). Seules les entrées nommées deviennent des points de données ; unité vide = suggestion en gris. La valeur en direct aide à l'attribution.", "La Violet ha ingressi fissi (vedi etichette). Solo gli ingressi con nome diventano punti dati; unità vuota = suggerimento in grigio. Il valore in tempo reale aiuta nell'assegnazione.", 'La Violet tiene entradas fijas (ver etiquetas). Solo las entradas con nombre se crean como puntos de datos; unidad vacía = sugerencia en gris. El valor en vivo ayuda a asignarlas.', 'Violet ma stałe wejścia (patrz etykiety). Punkty danych tworzone są tylko dla wejść z nazwą; pusta jednostka = podpowiedź na szaro. Wartość na żywo pomaga w przypisaniu.', 'Violet має фіксовані входи (див. підписи). Точки даних створюються лише для входів з назвою; порожня одиниця = сіра підказка. Поточне значення допомагає зіставити.', 'Violet 具有固定输入（见标签）。只有命名的输入才会创建数据点；单位留空 = 灰色建议值。实时值有助于识别。'],
    'Pulse 1 – measuring water monitoring': ['Impuls 1 – Messwasserüberwachung', 'Импульс 1 – контроль измерительной воды', 'Pulso 1 – monitoramento da água de medição', 'Puls 1 – meetwaterbewaking', 'Impulsion 1 – surveillance eau de mesure', "Impulso 1 – monitoraggio acqua di misura", 'Pulso 1 – control del agua de medición', 'Impuls 1 – kontrola wody pomiarowej', 'Імпульс 1 – контроль вимірювальної води', '脉冲 1 – 测量水监测'],
    'Pulse 2 – delivery rate': ['Impuls 2 – Förderleistung', 'Импульс 2 – производительность', 'Pulso 2 – vazão', 'Puls 2 – debiet', 'Impulsion 2 – débit', 'Impulso 2 – portata', 'Pulso 2 – caudal', 'Impuls 2 – wydajność', 'Імпульс 2 – продуктивність', '脉冲 2 – 输送量'],
    'ADC1 – filter pressure sensor': ['ADC1 – Filterdrucksensor', 'ADC1 – датчик давления фильтра', 'ADC1 – sensor de pressão do filtro', 'ADC1 – filterdruksensor', 'ADC1 – capteur de pression du filtre', 'ADC1 – sensore pressione filtro', 'ADC1 – sensor de presión del filtro', 'ADC1 – czujnik ciśnienia filtra', 'ADC1 – датчик тиску фільтра', 'ADC1 – 过滤器压力传感器'],
    'ADC2 – level probe': ['ADC2 – Pegelsonde', 'ADC2 – датчик уровня', 'ADC2 – sonda de nível', 'ADC2 – niveausonde', 'ADC2 – sonde de niveau', 'ADC2 – sonda di livello', 'ADC2 – sonda de nivel', 'ADC2 – sonda poziomu', 'ADC2 – датчик рівня', 'ADC2 – 液位探头'],
    'ADC3 – analog 4–20 mA': ['ADC3 – Analog 4–20 mA', 'ADC3 – аналоговый 4–20 мА', 'ADC3 – analógico 4–20 mA', 'ADC3 – analoog 4–20 mA', 'ADC3 – analogique 4–20 mA', 'ADC3 – analogico 4–20 mA', 'ADC3 – analógico 4–20 mA', 'ADC3 – analogowe 4–20 mA', 'ADC3 – аналоговий 4–20 мА', 'ADC3 – 模拟 4–20 mA'],
    'ADC4 – analog 4–20 mA': ['ADC4 – Analog 4–20 mA', 'ADC4 – аналоговый 4–20 мА', 'ADC4 – analógico 4–20 mA', 'ADC4 – analoog 4–20 mA', 'ADC4 – analogique 4–20 mA', 'ADC4 – analogico 4–20 mA', 'ADC4 – analógico 4–20 mA', 'ADC4 – analogowe 4–20 mA', 'ADC4 – аналоговий 4–20 мА', 'ADC4 – 模拟 4–20 mA'],
    'ADC5 – analog 0–10 V': ['ADC5 – Analog 0–10 V', 'ADC5 – аналоговый 0–10 В', 'ADC5 – analógico 0–10 V', 'ADC5 – analoog 0–10 V', 'ADC5 – analogique 0–10 V', 'ADC5 – analogico 0–10 V', 'ADC5 – analógico 0–10 V', 'ADC5 – analogowe 0–10 V', 'ADC5 – аналоговий 0–10 В', 'ADC5 – 模拟 0–10 V'],
    'ADC6 – analog input 6': ['ADC6 – Analogeingang 6', 'ADC6 – аналоговый вход 6', 'ADC6 – entrada analógica 6', 'ADC6 – analoge ingang 6', 'ADC6 – entrée analogique 6', 'ADC6 – ingresso analogico 6', 'ADC6 – entrada analógica 6', 'ADC6 – wejście analogowe 6', 'ADC6 – аналоговий вхід 6', 'ADC6 – 模拟输入 6'],
    'Unit': ['Einheit', 'Единица', 'Unidade', 'Eenheid', 'Unité', 'Unità', 'Unidad', 'Jednostka', 'Одиниця', '单位'],
    'Filter pressure': ['Filterdruck', 'Давление фильтра', 'Pressão do filtro', 'Filterdruk', 'Pression du filtre', 'Pressione del filtro', 'Presión del filtro', 'Ciśnienie filtra', 'Тиск фільтра', '过滤器压力'],
    'Water level': ['Füllstand', 'Уровень воды', 'Nível da água', 'Waterpeil', "Niveau d'eau", "Livello dell'acqua", 'Nivel del agua', 'Poziom wody', 'Рівень води', '水位'],
    'e.g. humidity': ['z. B. Luftfeuchte', 'например влажность', 'p. ex. umidade', 'bijv. luchtvochtigheid', 'p. ex. humidité', 'ad es. umidità', 'p. ej. humedad', 'np. wilgotność', 'напр. вологість', '例如湿度'],
    'Probe flow': ['Sonden-Anströmung', 'Поток через зонд', 'Fluxo da sonda', 'Sondedoorstroming', 'Débit de sonde', 'Flusso sonda', 'Flujo de sonda', 'Przepływ sondy', 'Потік через зонд', '探头流量'],
    'Delivery rate': ['Förderleistung', 'Производительность', 'Vazão', 'Debiet', 'Débit', 'Portata', 'Caudal', 'Wydajność', 'Продуктивність', '输送量'],

    # Relais
    'No relay extension selected (tab "Functions").': ['Keine Relaiserweiterung ausgewählt (Reiter „Funktionen“).', 'Релейное расширение не выбрано (вкладка «Функции»).', 'Nenhuma extensão de relés selecionada (aba "Funções").', 'Geen relaisuitbreiding geselecteerd (tabblad "Functies").', "Aucune extension relais sélectionnée (onglet « Fonctions »).", 'Nessuna espansione relè selezionata (scheda "Funzioni").', 'Ninguna extensión de relés seleccionada (pestaña "Funciones").', 'Nie wybrano rozszerzenia przekaźników (karta „Funkcje”).', 'Релейне розширення не вибрано (вкладка «Функції»).', '未选择继电器扩展（"功能"选项卡）。'],
    'Give the relays a name, e.g. "Garden light". Named relays appear with their name in ioBroker and in the relay view of the pool display.': ['Geben Sie den Relais einen Namen, z. B. „Gartenlicht“. Benannte Relais erscheinen mit ihrem Namen in ioBroker und in der Relais-Ansicht des Pool-Displays.', 'Дайте реле имена, например «Свет в саду». Реле с именами отображаются под ними в ioBroker и в режиме реле на дисплее.', 'Dê um nome aos relés, p. ex. "Luz do jardim". Relés nomeados aparecem com o nome no ioBroker e na vista de relés do display.', 'Geef de relais een naam, bijv. "Tuinverlichting". Benoemde relais verschijnen met hun naam in ioBroker en in de relaisweergave van het display.', "Donnez un nom aux relais, p. ex. « Éclairage jardin ». Les relais nommés apparaissent sous ce nom dans ioBroker et dans la vue relais de l'affichage.", 'Assegnate un nome ai relè, ad es. "Luce giardino". I relè con nome compaiono con il loro nome in ioBroker e nella vista relè del display.', 'Ponga un nombre a los relés, p. ej. "Luz del jardín". Los relés con nombre aparecen así en ioBroker y en la vista de relés de la pantalla.', 'Nadaj przekaźnikom nazwy, np. „Światło ogrodowe”. Nazwane przekaźniki pojawiają się pod nazwą w ioBroker i w widoku przekaźników wyświetlacza.', 'Дайте реле назви, напр. «Світло в саду». Реле з назвами відображаються з ними в ioBroker і в режимі реле на дисплеї.', '为继电器命名，例如"花园灯"。已命名的继电器会以该名称显示在 ioBroker 和显示屏的继电器视图中。'],
}

SENSOR = {'en': 'Sensor', 'de': 'Sensor', 'ru': 'Датчик', 'pt': 'Sensor', 'nl': 'Sensor', 'fr': 'Capteur', 'it': 'Sensore', 'es': 'Sensor', 'pl': 'Czujnik', 'uk': 'Датчик', 'zh-cn': '传感器'}
FREE = {'en': '(free)', 'de': '(frei)', 'ru': '(свободный)', 'pt': '(livre)', 'nl': '(vrij)', 'fr': '(libre)', 'it': '(libero)', 'es': '(libre)', 'pl': '(dowolny)', 'uk': '(вільний)', 'zh-cn': '（自定义）'}
FIXED = ['Water temperature', 'Outside temperature', 'Absorber temperature', 'Absorber return', 'Heat exchanger', 'Storage temperature']

OTHER = LANGS[1:]


def tr(key, lang):
    if lang == 'en':
        return key
    if key in T:
        return T[key][OTHER.index(lang)]
    return None


# zusammengesetzte Beschriftungen der Temperatursensoren
for i in range(1, 13):
    key = f'Sensor {i} – {FIXED[i-1].lower()}' if i <= 6 else f'Sensor {i} (free)'
    vals = []
    for lang in OTHER:
        if i <= 6:
            vals.append(f'{SENSOR[lang]} {i} – {tr(FIXED[i-1], lang)}')
        else:
            vals.append(f'{SENSOR[lang]} {i} {FREE[lang]}')
    T[key] = vals


# ------------------------------------------------------------------ jsonConfig
def W(xs=12, sm=6, md=4, lg=3, xl=3):
    return {'xs': xs, 'sm': sm, 'md': md, 'lg': lg, 'xl': xl}

FULL = W(12, 12, 12, 12, 12)

def hdr(text, hidden=None):
    d = {'type': 'header', 'text': text, 'size': 5, 'newLine': True, **FULL}
    if hidden: d['hidden'] = hidden
    return d

def static(text, hidden=None, dim=False):
    d = {'type': 'staticText', 'text': text, 'newLine': True, **FULL}
    if hidden: d['hidden'] = hidden
    if dim: d['style'] = {'opacity': 0.75}
    return d

def cb(label, tooltip=None, hidden=None, newLine=False):
    d = {'type': 'checkbox', 'label': label, **W()}
    if newLine: d['newLine'] = True
    if tooltip: d['tooltip'] = tooltip
    if hidden: d['hidden'] = hidden
    return d

conn = {
    'host': {'type': 'text', 'label': 'IP address or host name of the Violet', 'tooltip': 'e.g. 10.10.3.50 or 10.10.3.50:8080 (without http://)', **W()},
    'username': {'type': 'text', 'label': 'User name', 'tooltip': 'Login of the Violet web interface (usually not needed for reading only)', **W()},
    'password': {'type': 'password', 'label': 'Password', 'repeat': False, 'visible': True, **W()},
    'interval': {'type': 'number', 'label': 'Polling interval (seconds)', 'min': 5, 'max': 3600, 'newLine': True, **W()},
    'timeout': {'type': 'number', 'label': 'Timeout per request (seconds)', 'min': 2, 'max': 60, **W()},
    'hdrSwitch': hdr('Switching from ioBroker'),
    'allow_switching': cb('Allow switching (ON / OFF / AUTO)', 'Creates a data point "schalten" for each function. Dosing, cover and Violet settings are deliberately not switchable.', newLine=True),
    'switch_duration': {'type': 'number', 'label': 'Duration for manual ON/OFF (minutes)', 'min': 0, 'max': 1440, 'hidden': '!data.allow_switching', 'tooltip': '0 = permanently, until switched back to AUTO', **W()},
    'switchNote': static('User name and password of the Violet are usually required for switching. Not switchable: dosing, cover, settings.', '!data.allow_switching', True),
    'hdrWeb': hdr('Pool display'),
    'web_enabled': cb('Provide pool display', 'Built-in web server: http://<ioBroker-IP>:<port>/ – use only in your home network, do not expose to the internet', newLine=True),
    'port': {'type': 'port', 'label': 'Port', 'min': 1024, 'max': 65535, 'hidden': '!data.web_enabled', **W()},
    'display_font': {'type': 'select', 'label': 'Font of the pool display', 'hidden': '!data.web_enabled', 'options': [
        {'label': 'Verdana (classic)', 'value': 'verdana'}, {'label': 'Arial', 'value': 'arial'}, {'label': 'System font', 'value': 'system'}], **W()},
    'webNote': static('Address: http://<ioBroker-IP>:<port>/ – switches in the pool display only if "Allow switching" is enabled. Use only in your home network.', '!data.web_enabled', True),
}

func = {
    'intro': static('What do you use on your Violet? Only checked areas are created as data points.'),
    'h1': hdr('Water and filtration'),
    'use_water': cb('Water values (pH, redox, chlorine)', newLine=True),
    'use_pump': cb('Filter pump'),
    'use_pump_rpm': cb('Pump with speed levels', 'Only for speed-controlled pumps with levels 0–3', '!data.use_pump'),
    'use_backwash': cb('Automatic backwash'),
    'use_refill': cb('Refill / water level'),
    'h2': hdr('Dosing – which channels are in operation?'),
    'use_dos_cl': cb('Chlorine (liquid)', newLine=True),
    'use_dos_elo': cb('Electrolysis (salt)'),
    'use_dos_phm': cb('pH minus'),
    'use_dos_php': cb('pH plus'),
    'use_dos_floc': cb('Flocculant'),
    'h3': hdr('Heating, light and accessories'),
    'use_heater': cb('Heating / heat pump', newLine=True),
    'use_solar': cb('Solar heating'),
    'use_pv': cb('PV surplus mode'),
    'use_light': cb('Pool lighting'),
    'use_dmx': cb('DMX light scenes'),
    'use_cover': cb('Pool cover'),
    'use_eco': cb('ECO mode'),
    'h4': hdr('Extensions and inputs'),
    'use_ext1': cb('Relay extension 1', 'Relay names in the tab "Relays"', newLine=True),
    'use_ext2': cb('Relay extension 2'),
    'use_temp': cb('Temperature sensors', 'Sensors that are not connected are omitted automatically; names in the tab "Temperatures"'),
    'use_inputs': cb('Digital inputs'),
    'use_analog': cb('Analog / pulse inputs', 'e.g. filter pressure, humidity, probe flow – names and units in the tab "Analog"'),
    'h5': hdr('Scope of data'),
    'use_minmax': cb('Daily min/max of measured values', newLine=True),
    'use_details': cb('Switching times and runtimes', 'Creates 3 additional data points per function'),
    'use_system': cb('System information of the Violet'),
    'use_diag': cb('Diagnostics (fault counters)', hidden='!data.use_system && !data.use_temp'),
    'use_messages': cb('Violet messages (warnings, alarms, reminders)', 'Data point meldungen.aktiv and notice in the pool display; acknowledging only affects ioBroker'),
}

temps = {'ht': static('Sensors 1–6 are permanently assigned in the Violet and are named automatically as there (own name optional). From sensor 7 freely nameable. The current value is shown next to each field.')}
for i in range(1, 13):
    label = f'Sensor {i} – {FIXED[i-1].lower()}' if i <= 6 else f'Sensor {i} (free)'
    f = {'type': 'text', 'label': label, 'newLine': i % 2 == 1, **W(12, 6, 3, 3, 3)}
    if i <= 6:
        f['placeholder'] = FIXED[i-1]
    temps[f'temp{i}_name'] = f
    temps[f'temp{i}_value'] = {'type': 'textSendTo', 'command': 'getTemp', 'data': {'sensor': i}, 'container': 'div', 'style': {'paddingTop': 18, 'opacity': 0.85}, **W(12, 6, 3, 3, 3)}

units = ['bar', 'mbar', '%rF', '°C', 'cm/s', 'm³/h', 'l/min', 'V', 'mA', '%']
analog = {'ha': static('The Violet has fixed inputs (see labels). Only inputs with a name are created as data points; empty unit = suggestion in grey. The live value helps with the assignment.')}
A = [('imp1', 'IMP1_value', 'Pulse 1 – measuring water monitoring', 'Probe flow', 'cm/s'),
     ('imp2', 'IMP2_value', 'Pulse 2 – delivery rate', 'Delivery rate', 'm³/h'),
     ('adc1', 'ADC1_value', 'ADC1 – filter pressure sensor', 'Filter pressure', 'bar'),
     ('adc2', 'ADC2_value', 'ADC2 – level probe', 'Water level', ''),
     ('adc3', 'ADC3_value', 'ADC3 – analog 4–20 mA', '', ''),
     ('adc4', 'ADC4_value', 'ADC4 – analog 4–20 mA', '', ''),
     ('adc5', 'ADC5_value', 'ADC5 – analog 0–10 V', 'e.g. humidity', ''),
     ('adc6', 'ADC6_value', 'ADC6 – analog input 6', '', '')]
for k, key, label, ph, unit in A:
    n = {'type': 'text', 'label': label, 'newLine': True, **W(12, 6, 4, 4, 4)}
    if ph: n['placeholder'] = ph
    u = {'type': 'autocomplete', 'label': 'Unit', 'options': units, 'freeSolo': True, **W(6, 3, 2, 2, 2)}
    if unit: u['placeholder'] = unit
    analog[f'{k}_name'] = n
    analog[f'{k}_unit'] = u
    analog[f'{k}_value'] = {'type': 'textSendTo', 'command': 'getAnalog', 'data': {'key': key}, 'container': 'div', 'style': {'paddingTop': 18, 'opacity': 0.85}, **W(6, 3, 3, 3, 3)}

pump = {'hpump': static('Enter the delivery rate of the pump in m³/h. The adapter then calculates the water volume circulated today from the runtimes of the Violet (data point pumpe.umwaelzung_heute, in the pool display behind the runtime). If the absorber or heating reduces the flow, enter the lower value there – empty = same as alone. If both run at the same time, the lower value applies.')}
for st, label in [('p', 'Filter pump – m³/h'), ('1', 'Level 1 (ECO) – m³/h'), ('2', 'Level 2 (Normal) – m³/h'), ('3', 'Level 3 (Boost) – m³/h')]:
    rowHidden = 'data.use_pump_rpm' if st == 'p' else '!data.use_pump_rpm'
    num = lambda lbl, hid: {'type': 'number', 'label': lbl, 'min': 0, 'max': 200, 'step': 0.1, 'hidden': hid, **W(12, 4, 3, 3, 3)}
    pump[f'flow_{st}'] = {**num(label, rowHidden), 'newLine': True}
    pump[f'flow_{st}_solar'] = num('with absorber – m³/h', f'{rowHidden} || !data.use_solar')
    pump[f'flow_{st}_heater'] = num('with heating – m³/h', f'{rowHidden} || !data.use_heater')

relays = {'hrinfo': static('Give the relays a name, e.g. "Garden light". Named relays appear with their name in ioBroker and in the relay view of the pool display.', 'data.use_ext1 !== true && data.use_ext2 !== true')}
for e in (1, 2):
    relays[f'hr{e}'] = hdr(f'Relay extension {e}', f'!data.use_ext{e}')
    for r in range(1, 9):
        relays[f'ext{e}_{r}_name'] = {'type': 'text', 'label': f'EXT{e}.{r}', 'newLine': r % 4 == 1, 'hidden': f'!data.use_ext{e}', **W(12, 6, 3, 3, 3)}
relays['hrnone'] = static('No relay extension selected (tab "Functions").', 'data.use_ext1 || data.use_ext2')

config = {'i18n': True, 'type': 'tabs', 'items': {
    'tabConn': {'type': 'panel', 'label': 'Connection', 'items': conn},
    'tabFunc': {'type': 'panel', 'label': 'Functions', 'items': func},
    'tabTemp': {'type': 'panel', 'label': 'Temperatures', 'hidden': '!data.use_temp', 'items': temps},
    'tabAnalog': {'type': 'panel', 'label': 'Analog', 'hidden': '!data.use_analog', 'items': analog},
    'tabPump': {'type': 'panel', 'label': 'Pump', 'hidden': '!data.use_pump', 'items': pump},
    'tabRelay': {'type': 'panel', 'label': 'Relays', 'items': relays},
}}

# alle übersetzbaren Texte einsammeln und prüfen
used = set()
def walk(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ('label', 'text', 'tooltip', 'help', 'placeholder') and isinstance(v, str):
                used.add(v)
            walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
walk(config)
missing = sorted(s for s in used if s not in T and not s.startswith('EXT') and s not in ('Arial',) and s not in units)
if missing:
    raise SystemExit('Fehlende Übersetzungen:\n' + '\n'.join(missing))

json.dump(config, open('admin/jsonConfig.json', 'w'), indent=2, ensure_ascii=False)
for lang in LANGS:
    os.makedirs(f'admin/i18n/{lang}', exist_ok=True)
    data = {s: (tr(s, lang) if s in T else s) for s in sorted(used)}
    json.dump(data, open(f'admin/i18n/{lang}/translations.json', 'w'), indent=2, ensure_ascii=False)
print(f'{len(used)} Texte, {len(LANGS)} Sprachen geschrieben')
