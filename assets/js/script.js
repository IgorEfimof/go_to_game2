document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded. Initializing script.');

    const games = [5, 6, 7, 8, 9, 10];
    const fields = games.flatMap(g => [`g${g}P1`, `g${g}P2`]);
    const inputElements = fields.map(id => document.getElementById(id)).filter(el => el !== null);

    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const errorText = document.getElementById('error'); // Уже ссылается на errorDiv

    const keyboardContainer = document.getElementById('custom-keyboard-container');
    const keyboard = document.getElementById('custom-keyboard');
    let activeInput = null;
    const clearDataBtn = document.getElementById('clearDataBtn');

    // Функция для блокировки нативной клавиатуры (осталась для контроля)
    function preventNativeKeyboard(e) {
        // e.relatedTarget && e.relatedTarget.tagName === 'BUTTON' - эта проверка не нужна, т.к. focus/blur не вызываются при нажатии на кастомн…
        // Основная цель - preventDefault на touchstart
    }

    // --- Keyboard Logic ---
    function showKeyboard(input) {
        console.log('showKeyboard called for input:', input.id);
        if (activeInput === input && keyboardContainer.classList.contains('show')) {
            return; // Клавиатура уже показана для этого инпута
        }

        activeInput = input;

        // Важно: отменяем стандартный blur и фокус для iOS, чтобы не вызывать нативную клавиатуру
        // Вместо blur() и focus() с таймаутом, которые могут вызвать мерцание,
        // мы просто показываем клавиатуру и устанавливаем селекцию.
        // input.blur(); // Этот вызов может закрыть клавиатуру раньше, чем нужно
        // input.focus(); // Может вызвать мерцание
        input.setSelectionRange(input.value.length, input.value.length); // Перемещаем курсор в конец

        keyboardContainer.style.display = 'flex'; // Показываем контейнер сразу
        setTimeout(() => {
            keyboardContainer.classList.add('show'); // Запускаем анимацию
        }, 50); // Небольшая задержка для применения display:flex перед transition

        resultDiv.classList.remove('visible');
        errorDiv.classList.remove('visible');
    }

    function hideKeyboard() {
        console.log('hideKeyboard called.');
        keyboardContainer.classList.remove('show');
        keyboardContainer.addEventListener('transitionend', function handler() {
            keyboardContainer.style.display = 'none'; // Скрываем после анимации
            keyboardContainer.removeEventListener('transitionend', handler);
            activeInput = null; // Сбрасываем активный инпут
        }, { once: true }); // Обработчик выполнится только один раз

        calculateWinner(); // Вызываем расчет после скрытия клавиатуры
    }

    // Обработчики событий для полей ввода
    inputElements.forEach((input) => {
        if (input) {
            input.addEventListener('focus', function(e) {
                console.log('Input focused:', this.id);
                showKeyboard(this);
            });

            // Для мобильных устройств: предотвращаем появление нативной клавиатуры при тапе
            input.addEventListener('touchstart', function(e) {
                console.log('Input touchstarted:', this.id);
                e.preventDefault(); // Предотвращаем стандартное поведение (открытие нативной клавиатуры)
                if (document.activeElement !== this) {
                    this.focus(); // Устанавливаем фокус на поле
                }
            }, { passive: false }); // Passive: false обязательно для preventDefault

            input.addEventListener('blur', function(e) {
                console.log('Input blurred:', this.id, 'relatedTarget:', e.relatedTarget ? e.relatedTarget.tagName : 'none');
                if (e.relatedTarget === null || (!keyboardContainer.contains(e.relatedTarget) && !inputElements.some(el => el === e.relatedTarget))) {
                    if (!inputElements.includes(e.relatedTarget)) {
                        // hideKeyboard(); // Скрываем, если фокус ушел куда-то еще, кроме другого поля ввода
                    }
                }
            });

            input.addEventListener('input', function(e) {
                console.log('Input value changed:', this.id, this.value);
                let val = this.value.replace(/[^\d.]/g, ''); // Разрешаем точки
                // Логика форматирования для X.YY
                const parts = val.split('.');
                if (parts.length > 2) { // Если больше одной точки, оставляем только первую
                    val = parts[0] + '.' + parts.slice(1).join('');
                }
                if (parts[0].length > 1 && !val.includes('.')) { // Если число >9 и нет точки, ставим 1.XX
                    val = parts[0].substring(0,1) + '.' + parts[0].substring(1,3);
                }
                if (val.length > this.maxLength) { // Обрезаем по maxlength
                    val = val.substring(0, this.maxLength);
                }
                this.value = val;

                // Автоматический переход к следующему полю, если текущее заполнено
                if (this.value.length === this.maxLength && !this.value.endsWith('.')) {
                    const currentIndex = inputElements.indexOf(this);
                    if (currentIndex !== -1 && currentIndex < inputElements.length - 1) {
                        setTimeout(() => {
                            inputElements[currentIndex + 1].focus(); // Фокус на следующий инпут
                        }, 10); // Очень маленькая задержка для плавности
                    } else if (currentIndex === inputElements.length - 1) {
                        // Если это последнее поле и оно заполнено, скрываем клавиатуру
                        this.blur();
                        hideKeyboard();
                    }
                }
            });
        }
    });

    // Обработчик кликов по кнопкам клавиатуры
    keyboard.addEventListener('click', function(e) {
        e.preventDefault(); // Предотвращаем потерю фокуса и скролл
        const button = e.target.closest('button');
        if (!button) return;

        if (!activeInput) {
            console.warn('No active input, keyboard button click ignored.');
            return;
        }

        const key = button.dataset.key;
        console.log('Keyboard button pressed:', key);

        // Обновляем значение поля ввода
        let currentValue = activeInput.value;

        if (key === 'delete') {
            activeInput.value = currentValue.slice(0, -1);
        } else if (key === '.') {
            if (!currentValue.includes('.')) {
                if (currentValue === '') {
                    activeInput.value = '1.'; // Автоматически добавляем "1."
                } else {
                    activeInput.value += '.';
                }
            }
        } else if (currentValue.length < activeInput.maxLength) { // Числовые кнопки (0-9)
            if (currentValue === '1.' && key === '0' && activeInput.maxLength === 4) {
                activeInput.value = '1.0';
            } else {
                activeInput.value += key;
            }
        }

        // Принудительно вызываем событие 'input', чтобы сработала логика форматирования и автоперехода
        const event = new Event('input', { bubbles: true });
        activeInput.dispatchEvent(event);
    });

    // --- Новая функция очистки данных ---
    function clearAllData() {
        console.log('Clearing all data...');
        // Очищаем все поля ввода
        inputElements.forEach(input => {
            input.value = '';
            input.classList.remove('is-invalid');
        });

        // Скрываем блоки результата и ошибки
        resultDiv.classList.remove('visible');
        errorDiv.classList.remove('visible');
        errorText.textContent = '';

        // Возвращаем фокус на первое поле и показываем клавиатуру
        if (inputElements.length > 0) {
            inputElements[0].focus();
            showKeyboard(inputElements[0]);
        }

        // Пересчитываем, чтобы обновить состояние после очистки (покажет начальное сообщение)
        calculateWinner();
    }

    // Обработчик события для кнопки "Очистить"
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', clearAllData);
    }

    // --- Main Calculation Function ---
    function calculateWinner() {
        console.log('calculateWinner called.');
        let player1Coeffs = [];
        let player2Coeffs = [];
        let allCoeffsValid = true;
        let lastFilledGameIndex = -1; // Индекс последнего заполненного гейма

        for (let i = 0; i < games.length; i++) {
            const gameNumber = games[i];
            const p1Input = document.getElementById(`g${gameNumber}P1`);
            const p2Input = document.getElementById(`g${gameNumber}P2`);

            if (p1Input && p2Input) {
                const p1Val = parseFloat(p1Input.value);
                const p2Val = parseFloat(p2Input.value);

                const isP1Valid = !isNaN(p1Val) && p1Val >= 1.00 && p1Val <= 10.00;
                const isP2Valid = !isNaN(p2Val) && p2Val >= 1.00 && p2Val <= 10.00;

                if (p1Input.value.length > 0 && !isP1Valid) {
                    p1Input.classList.add('is-invalid');
                    allCoeffsValid = false;
                } else {
                    p1Input.classList.remove('is-invalid');
                }

                if (p2Input.value.length > 0 && !isP2Valid) {
                    p2Input.classList.add('is-invalid');
                    allCoeffsValid = false;
                } else {
                    p2Input.classList.remove('is-invalid');
                }

                player1Coeffs.push(isP1Valid ? p1Val : NaN);
                player2Coeffs.push(isP2Valid ? p2Val : NaN);

                if (p1Input.value.length > 0 || p2Input.value.length > 0) {
                    lastFilledGameIndex = i;
                }
            }
        }

        const hasAnyInput = inputElements.some(input => input.value.length > 0);
        const hasMinimumInput = !isNaN(player1Coeffs[0]) && !isNaN(player2Coeffs[0]);

        if (!hasAnyInput) {
            errorText.textContent = 'Введите коэффициенты для геймов 5-10.';
            errorDiv.classList.add('visible');
            resultDiv.classList.remove('visible');
            return;
        }

        if (!allCoeffsValid) {
            errorText.textContent = 'Проверьте формат коэффициентов (например, 1.85). Значения должны быть от 1.00 до 10.00.';
            errorDiv.classList.add('visible');
            resultDiv.classList.remove('visible');
            return;
        }

        if (!hasMinimumInput) {
            errorText.textContent = 'Для расчета необходимо заполнить коэффициенты для Гейма 5.';
            errorDiv.classList.add('visible');
            resultDiv.classList.remove('visible');
            return;
        }

        errorText.textContent = '';
        errorDiv.classList.remove('visible');

        // Показываем результат только если клавиатура не активна
        if (!keyboardContainer.classList.contains('show')) {
            resultDiv.classList.add('visible');
        }

        let totalDecimalPlayer1 = 0;
        let totalDecimalPlayer2 = 0;

        let totalDecreaseSpreadP1 = 0;
        let totalIncreaseSpreadP1 = 0;
        let totalDecreaseSpreadP2 = 0;
        let totalIncreaseSpreadP2 = 0;

        let filledGamesCount = 0; // Количество полностью заполненных пар геймов

        for (let i = 0; i <= lastFilledGameIndex; i++) {
            const p1Current = player1Coeffs[i];
            const p2Current = player2Coeffs[i];

            if (!isNaN(p1Current) && !isNaN(p2Current)) {
                totalDecimalPlayer1 += (p1Current - Math.floor(p1Current));
                totalDecimalPlayer2 += (p2Current - Math.floor(p2Current));
                filledGamesCount++;

                if (i > 0) {
                    const p1Previous = player1Coeffs[i - 1];
                    const p2Previous = player2Coeffs[i - 1];

                    if (!isNaN(p1Previous) && !isNaN(p1Current)) {
                        const spreadP1 = p1Previous - p1Current;
                        if (spreadP1 > 0) {
                            totalDecreaseSpreadP1 += spreadP1;
                        } else if (spreadP1 < 0) {
                            totalIncreaseSpreadP1 += Math.abs(spreadP1);
                        }
                    }

                    if (!isNaN(p2Previous) && !isNaN(p2Current)) {
                        const spreadP2 = p2Previous - p2Current;
                        if (spreadP2 > 0) {
                            totalDecreaseSpreadP2 += spreadP2;
                        } else if (spreadP2 < 0) {
                            totalIncreaseSpreadP2 += Math.abs(spreadP2);
                        }
                    }
                }
            }
        }

        // --- Анализ суммы десятичных частей ---
        let overallWinnerDecimalSumMessage;
        let decimalSumVerdictMessage;
        let winnerByDecimalSum = null;

        let advantageDecimal = Math.abs(totalDecimalPlayer1 - totalDecimalPlayer2);

        document.getElementById('player1_sum').textContent = `Сумма дес. частей (И1): ${totalDecimalPlayer1.toFixed(4)}`;
        document.getElementById('player2_sum').textContent = `Сумма дес. частей (И2): ${totalDecimalPlayer2.toFixed(4)}`;

        if (totalDecimalPlayer1 < totalDecimalPlayer2) {
            overallWinnerDecimalSumMessage = `<span class="text-success-custom">Победитель: **Игрок 1**</span>`;
            decimalSumVerdictMessage = `Преимущество Игрока 1 по дес. частям: ${advantageDecimal.toFixed(4)}`;
            winnerByDecimalSum = 'Игрок 1';
        } else if (totalDecimalPlayer2 < totalDecimalPlayer1) {
            overallWinnerDecimalSumMessage = `<span class="text-success-custom">Победитель: **Игрок 2**</span>`;
            decimalSumVerdictMessage = `Преимущество Игрока 2 по дес. частям: ${advantageDecimal.toFixed(4)}`;
            winnerByDecimalSum = 'Игрок 2';
        } else {
            overallWinnerDecimalSumMessage = `<span class="text-info-custom">Вероятно трость</span>`;
            decimalSumVerdictMessage = "Разница десятичных частей = 0";
            winnerByDecimalSum = 'Ничья';
        }
        document.getElementById('overall_winner_decimal_sum').innerHTML = overallWinnerDecimalSumMessage;
        document.getElementById('decimal_sum_verdict').innerHTML = decimalSumVerdictMessage;

        // --- Анализ разбега Кф. ---
        let p1Uncertainty = 0;
        let p1ConfidencePercent = 0;
        if ((totalDecreaseSpreadP1 + totalIncreaseSpreadP1) > 0) {
            p1Uncertainty = (totalIncreaseSpreadP1 / (totalDecreaseSpreadP1 + totalIncreaseSpreadP1)) * 100;
            p1ConfidencePercent = 100 - p1Uncertainty;
        }
        let p1SpreadDetails = `Игрок 1: Снижение Кф. <span class="text-success-custom">↓${totalDecreaseSpreadP1.toFixed(4)}</span> | Увеличение Кф. <span class="text-danger-custom">↑${totalIncreaseSpreadP1.toFixed(4)}</span> | Уверенность: ${p1ConfidencePercent.toFixed(2)}%`;

        let p2Uncertainty = 0;
        let p2ConfidencePercent = 0;
        if ((totalDecreaseSpreadP2 + totalIncreaseSpreadP2) > 0) {
            p2Uncertainty = (totalIncreaseSpreadP2 / (totalDecreaseSpreadP2 + totalIncreaseSpreadP2)) * 100;
            p2ConfidencePercent = 100 - p2Uncertainty;
        }
        let p2SpreadDetails = `Игрок 2: Снижение Кф. <span class="text-success-custom">↓${totalDecreaseSpreadP2.toFixed(4)}</span> | Увеличение Кф. <span class="text-danger-custom">↑${totalIncreaseSpreadP2.toFixed(4)}</span> | Уверенность: ${p2ConfidencePercent.toFixed(2)}%`;

        let spreadVerdictMessage = "Вердикт по разбегу: ";

        const anySpreadMovement = (totalDecreaseSpreadP1 + totalIncreaseSpreadP1 + totalDecreaseSpreadP2 + totalIncreaseSpreadP2) > 0;

        let winnerBySpreadAnalysis = null;

        // === ВАША НОВАЯ ЛОГИКА В ЭТОМ БЛОКЕ ===
        if (filledGamesCount < 2) {
            spreadVerdictMessage += `<span class="text-warning-custom">Недостаточно данных (требуется мин. 2 гейма)</span>`;
        } else {
            if (
                totalDecreaseSpreadP1 > totalDecreaseSpreadP2 &&
                p1ConfidencePercent > p2ConfidencePercent
            ) {
                winnerBySpreadAnalysis = 'Игрок 1';
                spreadVerdictMessage += `<span class="text-success-custom">Победитель по разбегу: <b>Игрок 1</b></span>`;
            } else if (
                totalDecreaseSpreadP2 > totalDecreaseSpreadP1 &&
                p2ConfidencePercent > p1ConfidencePercent
            ) {
                winnerBySpreadAnalysis = 'Игрок 2';
                spreadVerdictMessage += `<span class="text-success-custom">Победитель по разбегу: <b>Игрок 2</b></span>`;
            } else {
                spreadVerdictMessage += `<span class="text-warning-custom">Ждем хорошей погоды</span>`;
                winnerBySpreadAnalysis = 'Ничья';
            }
        }

        document.getElementById('p1_spread_summary').innerHTML = p1SpreadDetails;
        document.getElementById('p2_spread_summary').innerHTML = p2SpreadDetails;
        document.getElementById('overall_winner_spread_analysis').innerHTML = spreadVerdictMessage;

        // --- Динамика последнего заполненного гейма ---
        let lastGameSpreadDynamicMessage = '';
        if (lastFilledGameIndex > 0) {
            const p1Last = player1Coeffs[lastFilledGameIndex];
            const p2Last = player2Coeffs[lastFilledGameIndex];
            const p1Prev = player1Coeffs[lastFilledGameIndex - 1];
            const p2Prev = player2Coeffs[lastFilledGameIndex - 1];

            if (!isNaN(p1Last) && !isNaN(p2Last) && !isNaN(p1Prev) && !isNaN(p2Prev)) {
                const spreadP1Last = p1Prev - p1Last;
                const spreadP2Last = p2Prev - p2Last;

                let p1ChangeText = '';
                let p2ChangeText = '';
                let p1Class = '';
                let p2Class = '';

                if (spreadP1Last > 0) { p1ChangeText = `снизился на ${spreadP1Last.toFixed(2)}`; p1Class = 'text-success-custom'; }
                else if (spreadP1Last < 0) { p1ChangeText = `вырос на ${Math.abs(spreadP1Last).toFixed(2)}`; p1Class = 'text-danger-custom'; }
                else { p1ChangeText = `не изменился`; p1Class = 'text-info-custom'; }

                if (spreadP2Last > 0) { p2ChangeText = `снизился на ${spreadP2Last.toFixed(2)}`; p2Class = 'text-success-custom'; }
                else if (spreadP2Last < 0) { p2ChangeText = `вырос на ${Math.abs(spreadP2Last).toFixed(2)}`; p2Class = 'text-danger-custom'; }
                else { p2ChangeText = `не изменился`; p2Class = 'text-info-custom'; }

                lastGameSpreadDynamicMessage = `<br><strong>Динамика посл. гейма (Г${games[lastFilledGameIndex]}):</strong><br>`;
                lastGameSpreadDynamicMessage += `И1: <span class="${p1Class}">Кф. ${p1ChangeText}.</span><br>`;
                lastGameSpreadDynamicMessage += `И2: <span class="${p2Class}">Кф. ${p2ChangeText}.</span>`;
            }
        }
        document.getElementById('last_game_spread_dynamic').innerHTML = lastGameSpreadDynamicMessage;


        // --- Общий вероятный победитель ---
        let finalWinnerMessage = "Вероятный победитель: ";
        let finalWinnerClass = 'text-info-custom';

        // Проверяем, есть ли победители по обоим критериям и совпадают ли они
        if (winnerByDecimalSum && winnerBySpreadAnalysis && winnerByDecimalSum === winnerBySpreadAnalysis) {
            finalWinnerMessage += `<span class="text-success-custom">**${winnerByDecimalSum}**</span>`;
            finalWinnerClass = 'text-success-custom';
        } else {
            finalWinnerMessage += `<span class="text-warning-custom">Ждем хорошей погоды</span>`;
            finalWinnerClass = 'text-warning-custom';
        }

        // Обновляем id элемента на `final_overall_winner` в вашем HTML,
        // или используйте `overall_winner_smallest_decimal` если вы хотите перезаписать его.
        // Я предлагаю использовать новое ID для ясности.
        document.getElementById('overall_winner_smallest_decimal').innerHTML = finalWinnerMessage;
        document.getElementById('overall_winner_smallest_decimal').className = `text-center ${finalWinnerClass}`;
    }

    // Инициализируем расчет при загрузке страницы, чтобы показать начальные сообщения
    calculateWinner();

    // Присваиваем фокус первому полю при загрузке, чтобы сразу была активна клавиатура
    if (inputElements.length > 0) {
        inputElements[0].focus();
    }
});
