// ==UserScript==
// @name         Direct Social Video Downloader (Fixed & Robust)
// @namespace    https://github.com/custom-downloader
// @version      3.00
// @description  X, Instagram ve TikTok videolarını doğrudan MP4 olarak indirir.
// @match        https://x.com/*
// @match        https://twitter.com/*
// @match        https://www.instagram.com/*
// @match        https://www.tiktok.com/*
// @connect      api.fxtwitter.com
// @connect      www.tikwm.com
// @connect      api.cobalt.tools
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    GM_addStyle(`
        .direct-dl-btn {
            position: fixed;
            z-index: 2147483647 !important;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(18, 18, 18, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.25);
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            backdrop-filter: blur(8px);
            transition: transform 0.15s ease, background 0.2s ease;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
        }
        .direct-dl-btn:hover {
            background: #1d9bf0;
            transform: scale(1.1);
        }
        .direct-dl-btn svg {
            width: 20px;
            height: 20px;
            fill: #fff;
            pointer-events: none;
        }
        .direct-dl-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(20, 20, 20, 0.95);
            color: #fff;
            padding: 10px 16px;
            border-radius: 6px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            z-index: 2147483647;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            transition: opacity 0.25s ease;
        }
    `);

    const Toast = {
        show(msg, duration = 3000) {
            const el = document.createElement('div');
            el.className = 'direct-dl-toast';
            el.textContent = msg;
            document.body.appendChild(el);
            setTimeout(() => {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 250);
            }, duration);
        }
    };

    const HttpClient = {
        request(options) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    ...options,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) resolve(res);
                        else reject(new Error(`HTTP Status ${res.status}`));
                    },
                    onerror: reject
                });
            });
        },
        async getJson(url) {
            const res = await this.request({ method: 'GET', url });
            return JSON.parse(res.responseText);
        },
        async postJson(url, payload) {
            const res = await this.request({
                method: 'POST',
                url,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                data: JSON.stringify(payload)
            });
            return JSON.parse(res.responseText);
        }
    };

    const Downloader = {
        async save(url, filename) {
            Toast.show('İndirme başlatıldı...');
            try {
                await new Promise((resolve, reject) => {
                    GM_download({
                        url,
                        name: filename,
                        saveAs: false,
                        onload: resolve,
                        onerror: reject
                    });
                });
                Toast.show('İndirme tamamlandı!');
            } catch {
                try {
                    const res = await HttpClient.request({ method: 'GET', url, responseType: 'blob' });
                    const blobUrl = URL.createObjectURL(res.response);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                    Toast.show('İndirme tamamlandı!');
                } catch {
                    Toast.show('İndirme başarısız oldu.');
                }
            }
        }
    };

    // --- STRATEGY PATTERN ---
    class BaseStrategy {
        matches(host) { throw new Error('Must implement'); }
        resolveUrl(videoEl) { return location.href.split('?')[0]; }
        async getDirectVideoUrl(postUrl) { throw new Error('Must implement'); }
    }

    class TwitterStrategy extends BaseStrategy {
        matches(host) { return host.includes('x.com') || host.includes('twitter.com'); }
        resolveUrl(videoEl) {
            const article = videoEl.closest('article');
            const link = article?.querySelector('a[href*="/status/"]');
            return link ? link.href.split('?')[0] : location.href.split('?')[0];
        }
        async getDirectVideoUrl(postUrl) {
            const tweetId = postUrl.match(/status\/(\d+)/)?.[1];
            if (!tweetId) throw new Error('Tweet ID tespit edilemedi.');
            const data = await HttpClient.getJson(`https://api.fxtwitter.com/status/${tweetId}`);
            const videoUrl = data?.tweet?.media?.videos?.[0]?.url || data?.tweet?.media?.all?.[0]?.url;
            if (!videoUrl) throw new Error('Tweet videosu bulunamadı.');
            return videoUrl;
        }
    }

    class TikTokStrategy extends BaseStrategy {
        matches(host) { return host.includes('tiktok.com'); }
        resolveUrl(videoEl) {
            const container = videoEl.closest('[id*="xgwrapper"], [class*="xgplayer-container"]') ||
                              document.querySelector('[class*="xgplayer-container"]');
            const idMatch = container?.id?.match(/-(\d+)$/);
            if (idMatch) return `https://www.tiktok.com/@_/video/${idMatch[1]}`;

            const item = videoEl.closest('[data-e2e="recommend-list-item-container"], [class*="DivItemContainer"]');
            const link = item?.querySelector('a[href*="/video/"]');
            return link ? link.href.split('?')[0] : location.href.split('?')[0];
        }
        async getDirectVideoUrl(postUrl) {
            if (!postUrl.includes('/video/')) throw new Error('TikTok video linki çözümlenemedi.');
            const data = await HttpClient.getJson(`https://www.tikwm.com/api/?url=${encodeURIComponent(postUrl)}`);
            const playUrl = data?.data?.play || data?.data?.wmplay;
            if (!playUrl) throw new Error('TikTok videosu ayrıştırılamadı.');
            return playUrl;
        }
    }

    class InstagramStrategy extends BaseStrategy {
        matches(host) { return host.includes('instagram.com'); }
        resolveUrl(videoEl) {
            const article = videoEl.closest('article');
            const link = article?.querySelector('a[href*="/reel/"], a[href*="/p/"]');
            return link ? link.href.split('?')[0] : location.href.split('?')[0];
        }
        async getDirectVideoUrl(postUrl) {
            const data = await HttpClient.postJson('https://api.cobalt.tools', { url: postUrl });
            if (!data?.url) throw new Error('Instagram kaynağı çözümlenemedi.');
            return data.url;
        }
    }

    const strategies = [new TwitterStrategy(), new TikTokStrategy(), new InstagramStrategy()];
    const activeStrategy = strategies.find(s => s.matches(location.hostname));
    if (!activeStrategy) return;

    // --- UI & POSITIONING ENGINE ---
    const btn = document.createElement('div');
    btn.className = 'direct-dl-btn';
    btn.title = 'Videoyu İndir';
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 16l-5-5 1.41-1.41L11 12.17V4h2v8.17l2.59-2.58L17 11l-5 5zm-6 2h12v2H6v-2z"/></svg>`;
    document.body.appendChild(btn);

    let currentTargetVideo = null;

    function positionButton(video) {
        const rect = video.getBoundingClientRect();
        if (rect.width < 120 || rect.height < 120) return;

        currentTargetVideo = video;
        btn.style.display = 'flex';
        btn.style.top = `${Math.max(12, rect.top + 14)}px`;
        btn.style.left = `${Math.max(12, rect.right - 54)}px`;
    }

    // Farenin altındaki en yakın videoyu bulan hafif algoritma
    function findVideoFromTarget(target) {
        if (!target || target === document.body || target === document.documentElement) return null;
        if (target.tagName === 'VIDEO') return target;

        // Overlay katmanlarının kapsayıcısından veya kardeşlerinden videoyu ara
        const container = target.closest('article, [data-e2e="recommend-list-item-container"], div[class*="video"], div[style*="aspect-ratio"]') || target.parentElement;
        if (container) {
            const video = container.querySelector('video');
            if (video) return video;
        }
        return null;
    }

    // mousemove yerine tekil mouseover dinleyicisi (CPU dostudur, katmanları deler)
    document.addEventListener('mouseover', (e) => {
        const target = e.target;
        if (target === btn || btn.contains(target)) return;

        const video = findVideoFromTarget(target);
        if (video) {
            positionButton(video);
        } else if (currentTargetVideo) {
            const rect = currentTargetVideo.getBoundingClientRect();
            // Farenin video alanından tamamen çıkıp çıkmadığını kontrol et
            if (
                e.clientX < rect.left || e.clientX > rect.right ||
                e.clientY < rect.top || e.clientY > rect.bottom
            ) {
                btn.style.display = 'none';
                currentTargetVideo = null;
            }
        }
    }, { passive: true });

    // Sayfa kaydırıldığında buton pozisyonunu güncelle
    window.addEventListener('scroll', () => {
        if (currentTargetVideo && btn.style.display === 'flex') {
            positionButton(currentTargetVideo);
        }
    }, { passive: true, capture: true });

    // Tıklama Yöneticisi
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentTargetVideo) return;
        const video = currentTargetVideo;
        const filename = `${location.hostname.replace('www.', '')}_${Date.now()}.mp4`;

        const src = video.currentSrc || video.src;
        if (src && !src.startsWith('blob:')) {
            await Downloader.save(src, filename);
            return;
        }

        try {
            Toast.show('Video bağlantısı çözümleniyor...');
            const postUrl = activeStrategy.resolveUrl(video);
            const downloadUrl = await activeStrategy.getDirectVideoUrl(postUrl);
            await Downloader.save(downloadUrl, filename);
        } catch (err) {
            Toast.show(err.message || 'Hata oluştu.');
        }
    });

})();