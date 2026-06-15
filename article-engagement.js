(function () {
  window.startArticleEngagementTracking = function (settings) {
    settings = settings || {};

    var cssSelector = settings.cssSelector || '.article-content';
    var articleTitle = settings.articleTitle || '';
    var wordsPerMinute = settings.wordsPerMinute || 220;

    var startViewportRatio = 0.5;
    var skimmedThreshold = 0.25;
    var readThreshold = 0.7;

    var element = document.querySelector(cssSelector);
    if (!element) return;

    var text = element.innerText || element.textContent || '';
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var expectedMs = words / wordsPerMinute * 60000;

    var startedAt = null;
    var hasStarted = false;
    var hasCompleted = false;

    var sentScroll25 = false;
    var sentScroll50 = false;
    var sentScroll75 = false;

    function getElapsedMs() {
      if (!startedAt) return 0;
      return Date.now() - startedAt;
    }

    function getStatus(elapsedMs) {
      var ratio = expectedMs > 0 ? elapsedMs / expectedMs : 0;

      if (ratio >= readThreshold) return 'read';
      if (ratio >= skimmedThreshold) return 'skimmed';
      return 'scrolled';
    }

    function pushEvent(eventName, elapsedMs) {
      window.dataLayer = window.dataLayer || [];

      window.dataLayer.push({
        event: eventName,
        article_engagement: {
          title: articleTitle,
          word_count: words,
          read_time_ms: Math.round(elapsedMs),
          expected_read_time_ms: Math.round(expectedMs),
          read_ratio: expectedMs > 0
            ? Math.round((elapsedMs / expectedMs) * 100) / 100
            : 0
        }
      });
    }

    function getVisibleViewportRatio() {
      var rect = element.getBoundingClientRect();

      var visibleTop = Math.max(rect.top, 0);
      var visibleBottom = Math.min(rect.bottom, window.innerHeight);
      var visibleHeight = Math.max(visibleBottom - visibleTop, 0);

      return visibleHeight / window.innerHeight;
    }

    function getArticleProgress() {
      var rect = element.getBoundingClientRect();
      return (window.innerHeight - rect.top) / rect.height;
    }

    function completeArticle() {
      if (hasCompleted || !hasStarted) return;

      hasCompleted = true;

      window.removeEventListener('scroll', checkProgress);
      window.removeEventListener('resize', checkProgress);

      pushEvent('article_' + getStatus(getElapsedMs()), getElapsedMs());
    }

    function checkProgress() {
      var progress = getArticleProgress();

      if (!hasStarted && getVisibleViewportRatio() >= startViewportRatio) {
        hasStarted = true;
        startedAt = Date.now();

        pushEvent('article_start', 0);
      }

      if (!hasStarted || hasCompleted) return;

      if (!sentScroll25 && progress >= 0.25) {
        sentScroll25 = true;
        pushEvent('article_25_scroll', getElapsedMs());
      }

      if (!sentScroll50 && progress >= 0.5) {
        sentScroll50 = true;
        pushEvent('article_50_scroll', getElapsedMs());
      }

      if (!sentScroll75 && progress >= 0.75) {
        sentScroll75 = true;
        pushEvent('article_75_scroll', getElapsedMs());
      }

      if (progress >= 1) {
        completeArticle();
      }
    }

    window.addEventListener('scroll', checkProgress);
    window.addEventListener('resize', checkProgress);

    checkProgress();
  };
})();
