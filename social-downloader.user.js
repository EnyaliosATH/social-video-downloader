// ==UserScript==
// @name         Direct Social Video Downloader (X, Instagram, TikTok)
// @namespace    https://github.com/custom-downloader
// @version      2.2.0
// @description  X (Twitter), Instagram ve TikTok videolarını reklamsız, yönlendirmesiz tek tıkla doğrudan MP4 olarak indirir.
// @author       Custom
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @match        https://www.instagram.com/*
// @match        https://www.tiktok.com/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Stil ve Bildirim (Toast) Tasarımı
    GM_addStyle(`
        .direct-dl-btn {
            position: fixed;
            z-index: 2147483647 !important;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(15, 15, 15, 0.85);
            border: 1.5px solid rgba(255, 255, 255, 0.25);
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            backdrop-filter: blur(6px);
            transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .direct-dl-btn:hover {
            background: #1d9bf0;
            border-color: #fff;
            transform: scale(1.08);
        }
        .direct-dl-btn svg {
            width: 22px;
            height: 22px;
            fill: #ffffff;
            pointer-events: none;
        }
        .direct-dl-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(20, 20, 20, 0.95);
            color: #fff;
            padding: 12px 18px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 2147483647;
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1);
            transition: opacity 0.25s ease;
        }
    `);

    function showToast(msg, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'direct-dl-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // İndirme Butonu Oluşturma
    function createDownloadButton() {
        const btn = document.createElement('div');
        btn.className = 'direct-dl-btn';
        btn.title = 'Videoyu İndir (MP4)';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 16l-5-5 1.41-1.41L11 12.17V4h2v8.17l2.59-2.58L17 11l-5 5zm-6 2h12v2H6v-2z"/>
            </svg>
        `;
        document.body.appendChild(btn);
        return btn;
    }

    // Gönderi URL'sini çözümleme
    function resolvePostUrl(videoEl) {
        const host = location.hostname;

        // X (Twitter)
        if (host.includes('x.com') || host.includes('twitter.com')) {
            const article = videoEl.closest('article');
            if (article) {
                const statusLink = article.querySelector('a[href*="/status/"]');
                if (statusLink) return statusLink.href.split('?')[0];
            }
        }

        // Instagram
        if (host.includes('instagram.com')) {
            const article = videoEl.closest('article');
            if (article) {
                const postLink = article.querySelector('a[href*="/reel/"], a[href*="/p/"], a[href*="/reels/"]');
                if (postLink) return postLink.href.split('?')[0];
            }
        }

        // TikTok (FYP Akışı ve Tekil Video Sayfaları)
        if (host.includes('tiktok.com')) {
            // 1. xgplayer container üzerinden video ID yakalama
            const container = videoEl.closest('[id*="xgwrapper"], [class*="xgplayer-container"]') ||
                              document.querySelector('[class*="xgplayer-container"]');
            if (container && container.id) {
                const idMatch = container.id.match(/-(\d+)$/);
                if (idMatch) {
                    return `https://www.tiktok.com/@_/video/${idMatch[1]}`;
                }
            }

            // 2. Akıştaki video kapsayıcısından a[href] linki yakalama
            const itemContainer = videoEl.closest('[data-e2e="recommend-list-item-container"], [class*="DivItemContainer"], [class*="DivVideoWrapper"]');
            if (itemContainer) {
                const aLink = itemContainer.querySelector('a[href*="/video/"]');
                if (aLink) return aLink.href.split('?')[0];
            }

            // 3. Mevcut adres zaten video URL'si ise
            if (location.pathname.includes('/video/')) {
                return location.href.split('?')[0];
            }
        }

        return location.href.split('?')[0];
    }

    // Doğrudan Dosya İndirme Fonksiyonu
    function downloadDirectFile(url, filename) {
        showToast('İndirme başlatıldı...');
        GM_download({
            url: url,
            name: filename,
            saveAs: false,
            onload: () => showToast('İndirme tamamlandı!'),
            onerror: () => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    onload: (res) => {
                        const blobUrl = URL.createObjectURL(res.response);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                        showToast('İndirme tamamlandı!');
                    },
                    onerror: () => showToast('İndirme başarısız oldu.')
                });
            }
        });
    }

    // Ana İndirme Yöneticisi
    async function handleDownload(videoEl) {
        if (!videoEl) return;

        const filename = `video_${Date.now()}.mp4`;
        const videoSrc = videoEl.currentSrc || videoEl.src;

        // 1. Eğer video doğrudan mp4 bağlantısına sahipse (blob değilse)
        if (videoSrc && !videoSrc.startsWith('blob:')) {
            downloadDirectFile(videoSrc, filename);
            return;
        }

        const postUrl = resolvePostUrl(videoEl);
        showToast('Video kaynağı çözümleniyor...');

        // X (Twitter) - FxTwitter API
        if (postUrl.includes('x.com') || postUrl.includes('twitter.com')) {
            const tweetIdMatch = postUrl.match(/status\/(\d+)/);
            if (!tweetIdMatch) {
                showToast('Tweet ID bulunamadı.');
                return;
            }
            const tweetId = tweetIdMatch[1];

            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.fxtwitter.com/status/${tweetId}`,
                onload: (res) => {
                    try {
                        const json = JSON.parse(res.responseText);
                        const media = json?.tweet?.media?.videos?.[0] || json?.tweet?.media?.all?.[0];
                        const downloadUrl = media?.url;

                        if (downloadUrl) {
                            downloadDirectFile(downloadUrl, filename);
                        } else {
                            showToast('Video URL bulunamadı.');
                        }
                    } catch (e) {
                        showToast('X API ayrıştırma hatası.');
                    }
                },
                onerror: () => showToast('X bağlantı hatası.')
            });
            return;
        }

        // TikTok - TikWM API
        if (postUrl.includes('tiktok.com')) {
            if (!postUrl.includes('/video/')) {
                showToast('TikTok video ID tespit edilemedi.');
                return;
            }

            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://www.tikwm.com/api/?url=${encodeURIComponent(postUrl)}`,
                onload: (res) => {
                    try {
                        const json = JSON.parse(res.responseText);
                        const playUrl = json?.data?.play || json?.data?.wmplay;
                        if (playUrl) {
                            downloadDirectFile(playUrl, filename);
                        } else {
                            showToast('TikTok videosu bulunamadı.');
                        }
                    } catch (e) {
                        showToast('TikTok API hatası.');
                    }
                },
                onerror: () => showToast('TikTok bağlantı hatası.')
            });
            return;
        }

        // Instagram - Cobalt v10 API
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://api.cobalt.tools',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                url: postUrl
            }),
            onload: (res) => {
                try {
                    const data = JSON.parse(res.responseText);
                    if (data?.url) {
                        downloadDirectFile(data.url, filename);
                    } else {
                        showToast('Video kaynağı alınamadı.');
                    }
                } catch (e) {
                    showToast('İndirme servisi yanıt vermedi.');
                }
            },
            onerror: () => showToast('Sunucuya ulaşılamadı.')
        });
    }

    // Fare Takibi ve Buton Konumlandırma
    const downloadBtn = createDownloadButton();
    let activeVideo = null;

    function updateButtonPosition(video) {
        const rect = video.getBoundingClientRect();
        if (rect.width < 60 || rect.height < 60) {
            downloadBtn.style.display = 'none';
            return;
        }
        downloadBtn.style.display = 'flex';
        downloadBtn.style.top = `${Math.max(10, rect.top + 14)}px`;
        downloadBtn.style.left = `${Math.max(10, rect.right - 56)}px`;
    }

    window.addEventListener('mousemove', (e) => {
        const target = e.target;

        if (target === downloadBtn || downloadBtn.contains(target)) {
            return;
        }

        const videos = document.querySelectorAll('video');
        let foundVideo = null;

        for (const v of videos) {
            const r = v.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
                if (r.width > 60 && r.height > 60) {
                    foundVideo = v;
                    break;
                }
            }
        }

        if (foundVideo) {
            activeVideo = foundVideo;
            updateButtonPosition(foundVideo);
        } else {
            downloadBtn.style.display = 'none';
            activeVideo = null;
        }
    }, { passive: true });

    window.addEventListener('scroll', () => {
        if (activeVideo && downloadBtn.style.display === 'flex') {
            updateButtonPosition(activeVideo);
        }
    }, { passive: true, capture: true });

    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (activeVideo) {
            handleDownload(activeVideo);
        }
    });

})();