/* ==========================================================================
Krishi Sahayak — AI Agriculture Chat Application
========================================================================== */

(function($) {
'use strict';

var WELCOME = '<div class="welcome">'
    + '<div class="welcome-icon"><i class="bi bi-flower2"></i></div>'
    + '<h3>Krishi Sahayak</h3>'
    + '<p>Your AI agriculture assistant. Ask anything about crops, pests, soil, weather, or farming practices.</p>'
    + '<div class="chips">'
    + '<span class="chip" data-text="What is the best time to plant wheat in India?"><i class="bi bi-calendar3"></i> Wheat planting season</span>'
    + '<span class="chip" data-text="How to control pest attack on tomato plants?"><i class="bi bi-bug"></i> Tomato pest control</span>'
    + '<span class="chip" data-text="What fertilizer is good for paddy rice?"><i class="bi bi-droplet"></i> Paddy fertilizer</span>'
    + '<span class="chip" data-text="Tell me about PM-KISAN scheme eligibility"><i class="bi bi-card-list"></i> PM-KISAN scheme</span>'
    + '</div></div>';

var mediaRecorder = null;
var audioChunks = [];
var isRecording = false;
var isProcessing = false;

var $messages = $('#chatMessages');
var $form = $('#chatForm');
var $input = $('#userInput');

var $sendBtn = $('#sendBtn');
var $voiceBtn = $('#voiceBtn');
var $typing = $('#typingIndicator');

var $audio = $('#audioPlayer');
var $clearBtn = $('#clearBtn');
var $themeBtn = $('#themeToggle');
var $themeIcon = $('#themeIcon');


// ── Init ──────────────────────────────────────────────────────────────

$(document).ready(function() {

    initTheme();
    showWelcome();
    updateDate();

    $form.on('submit', handleSend);

    $input.on('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            $form.trigger('submit');
        }
    });

    $voiceBtn.on('click', toggleRecording);

    $clearBtn.on('click', clearConversation);

    $themeBtn.on('click', toggleTheme);

    $messages.on('click', '.chip', function() {
        var text = $(this).data('text');

        if (text) {
            $input.val(text);
            $form.trigger('submit');
        }
    });

    if ('Notification' in window &&
        Notification.permission === 'default') {

        Notification.requestPermission();
    }

    $input.trigger('focus');
});


// ── Theme ─────────────────────────────────────────────────────────────

function initTheme() {

    if (localStorage.getItem('agri-bot-theme') === 'dark') {

        document.documentElement.setAttribute(
            'data-theme',
            'dark'
        );

        $themeIcon
            .removeClass('bi-moon-stars-fill')
            .addClass('bi-sun-fill');
    }
}


function toggleTheme() {

    var dark =
        document.documentElement.getAttribute('data-theme') === 'dark';

    if (dark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('agri-bot-theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('agri-bot-theme', 'dark');
    }

    $themeIcon.toggleClass(
        'bi-moon-stars-fill bi-sun-fill'
    );
}


// ── Helpers ───────────────────────────────────────────────────────────

function showWelcome() {
    $messages.html(WELCOME);
}


function updateDate() {

    $('#dateDisplay').text(
        new Date().toLocaleDateString(
            'en-IN',
            {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            }
        )
    );
}


function scrollBottom() {

    $messages.stop().animate(
        {
            scrollTop: $messages[0].scrollHeight
        },
        250
    );
}


function getTime() {

    return new Date().toLocaleTimeString(
        [],
        {
            hour: '2-digit',
            minute: '2-digit'
        }
    );
}


function showTyping() {

    $typing.addClass('visible');
    scrollBottom();
}


function hideTyping() {

    $typing.removeClass('visible');
}


function esc(text) {

    var div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;
}


// ── Messages ──────────────────────────────────────────────────────────

function addMessage(text, type, cache) {

    var isUser = type === 'user';

    var icon = isUser
        ? 'bi-person-fill'
        : 'bi-flower2';

    if (isUser && $messages.find('.welcome').length) {
        $messages.find('.welcome').remove();
    }

    var cacheTag = '';

    if (cache && cache.cached_tokens > 0) {

        cacheTag =
            '<span class="cache-tag">'
            + '<i class="bi bi-lightning-fill"></i>'
            + cache.hit_rate
            + '% cached'
            + '</span>';
    }

    var html =
        '<div class="msg ' + type + '">'
        + '<div class="msg-av">'
        + '<i class="bi ' + icon + '"></i>'
        + '</div>'
        + '<div class="bubble">'
        + '<div>'
        + esc(text).replace(/\n/g, '<br>')
        + '</div>'
        + '<div class="msg-meta">'
        + '<span>' + getTime() + '</span>'
        + cacheTag
        + '</div>'
        + '</div>'
        + '</div>';

    $messages.append(html);

    scrollBottom();
}


// ── Send Text Message ─────────────────────────────────────────────────

function handleSend(e) {

    e.preventDefault();

    var text = $input.val().trim();

    if (!text) {
        return;
    }

    if (isProcessing) {
        return;
    }

    isProcessing = true;

    $input.val('');

    $sendBtn.prop('disabled', true);
    $voiceBtn.prop('disabled', true);

    addMessage(text, 'user');

    showTyping();

    $.ajax({
        url: '/chat',
        type: 'POST',
        data: {
            text: text
        },
        timeout: 60000
    })

    .done(function(response) {

        hideTyping();

        if (response.text) {

            addMessage(
                response.text,
                'bot',
                response.cache
            );

            playVoice(response.voice);
        }
    })

    .fail(function(xhr) {

        hideTyping();

        addMessage(
            getError(xhr),
            'bot'
        );
    })

    .always(function() {

        isProcessing = false;

        $sendBtn.prop('disabled', false);
        $voiceBtn.prop('disabled', false);

        $input.trigger('focus');
    });
}


// ── Voice Output ──────────────────────────────────────────────────────

function playVoice(src) {

    if (!src) {
        return;
    }

    $audio.attr('src', src);

    $audio[0].play().catch(function() {});

    if ('Notification' in window &&
        Notification.permission === 'granted') {

        new Notification(
            'Krishi Sahayak',
            {
                body: 'Voice response ready',
                icon: '/static/images/favicon.ico'
            }
        );
    }
}


// ── Error Handling ────────────────────────────────────────────────────

function getError(xhr) {

    if (xhr.status === 400 && xhr.responseJSON) {

        return xhr.responseJSON.error ||
            'Bad request.';
    }

    if (xhr.status === 429) {

        return 'Too many requests. Please wait.';
    }

    if (xhr.statusText === 'timeout') {

        return 'Request timed out. Try again.';
    }

    return 'Something went wrong. Please try again.';
}


// ── Voice Recording ────────────────────────────────────────────────────

function toggleRecording() {

    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}


async function startRecording() {

    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

        showToast('Voice not supported.');

        return;
    }

    try {

        var stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        audioChunks = [];

        var mimeType =
            MediaRecorder.isTypeSupported(
                'audio/webm;codecs=opus'
            )
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';

        mediaRecorder =
            new MediaRecorder(
                stream,
                {
                    mimeType: mimeType
                }
            );

        mediaRecorder.ondataavailable =
            function(e) {

                if (e.data.size > 0) {

                    audioChunks.push(e.data);
                }
            };


        mediaRecorder.onstop =
            function() {

                var audioBlob =
                    new Blob(
                        audioChunks,
                        {
                            type: 'audio/webm'
                        }
                    );

                sendAudio(audioBlob);

                stream
                    .getTracks()
                    .forEach(function(track) {
                        track.stop();
                    });
            };


        mediaRecorder.onerror =
            function() {

                showToast('Mic error.');

                stream
                    .getTracks()
                    .forEach(function(track) {
                        track.stop();
                    });

                isRecording = false;

                $voiceBtn.removeClass('recording');
            };


        mediaRecorder.start(250);

        isRecording = true;

        $voiceBtn.addClass('recording');

        showToast('Recording...');

    } catch (err) {

        showToast('Mic access denied.');
    }
}


function stopRecording() {

    if (mediaRecorder &&
        mediaRecorder.state !== 'inactive') {

        mediaRecorder.stop();
    }

    isRecording = false;

    $voiceBtn.removeClass('recording');
}


// ── Send Audio ─────────────────────────────────────────────────────────

function sendAudio(blob) {

    if (isProcessing) {
        return;
    }

    isProcessing = true;

    $sendBtn.prop('disabled', true);
    $voiceBtn.prop('disabled', true);

    showTyping();

    var formData = new FormData();

    formData.append(
        'audio',
        blob,
        'recording.webm'
    );

    $.ajax({
        url: '/chat',
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        timeout: 30000
    })

    .done(function(response) {

        hideTyping();

        if (response.transcription) {

            addMessage(
                response.transcription,
                'user'
            );
        }

        if (response.text) {

            addMessage(
                response.text,
                'bot',
                response.cache
            );

            playVoice(response.voice);
        }
    })

    .fail(function() {

        hideTyping();

        addMessage(
            'Could not process audio.',
            'bot'
        );
    })

    .always(function() {

        isProcessing = false;

        $sendBtn.prop('disabled', false);
        $voiceBtn.prop('disabled', false);

        $input.trigger('focus');
    });
}


// ── Clear Conversation ────────────────────────────────────────────────

function clearConversation() {

    if (!$messages.find('.msg').length) {
        return;
    }

    if (!confirm('Clear this conversation?')) {
        return;
    }

    $.post(
        '/chat/clear',
        function() {

            showWelcome();

            $audio.attr('src', '');

            $input.trigger('focus');
        }
    );
}


// ── Toast ─────────────────────────────────────────────────────────────

function showToast(msg) {

    $('.toast-msg').remove();

    var toast =
        $(
            '<div class="toast-msg">'
            + '<i class="bi bi-info-circle me-1" '
            + 'style="color:var(--primary)"></i>'
            + esc(msg)
            + '</div>'
        );

    $('body').append(toast);

    toast.fadeIn(200);

    setTimeout(function() {

        toast.fadeOut(
            200,
            function() {
                $(this).remove();
            }
        );

    }, 3000);
}


})(jQuery);
