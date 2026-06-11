(function () {
  window.startArticleEngagementTracking = function (settings) {
    settings = settings || {};

    var cssSelector = settings.cssSelector || '.article-content';
    var articleTitle = settings.articleTitle || '';
    var wordsPerMinute = settings.wordsPerMinute || 220;
    var bottomVisibleRequiredMs = settings.bottomVisibleRequiredMs || 2000;
    var eventPrefix = settings.eventPrefix || 'article_';

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
    var bottomTimer = null;

    function getEventName(name) {
      return eventPrefix + name;
    }

    function pushEvent(eventName, elapsedMs) {
      window.dataLayer = window.dataLayer || [];

      window.dataLayer.push({
        event: getEventName(eventName),
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

    function classify(elapsedMs) {
      var ratio = expectedMs > 0 ? elapsedMs / expectedMs : 0;

      if (ratio >= readThreshold) return 'read';
      if (ratio >= skimmedThreshold) return 'skimmed';
      return 'scrolled';
    }

    function isFullyVisible() {
      var rect = element.getBoundingClientRect();

      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    }

    function startTracking() {
      if (hasStarted) return;

      hasStarted = true;
      startedAt = Date.now();

      pushEvent('start', 0);
    }

    if (isFullyVisible()) {
      startTracking();

      setTimeout(function () {
        pushEvent('scrolled', Date.now() - startedAt);
      }, bottomVisibleRequiredMs);

      setTimeout(function () {
        pushEvent('skimmed', Date.now() - startedAt);
      }, expectedMs * skimmedThreshold);

      setTimeout(function () {
        pushEvent('read', Date.now() - startedAt);
      }, expectedMs * readThreshold);

      return;
    }

    var startObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.intersectionRatio >= startViewportRatio) {
          startTracking();
          startObserver.disconnect();
        }
      });
    }, {
      threshold: [startViewportRatio]
    });

    startObserver.observe(element);

    var bottomMarker = document.createElement('div');
    bottomMarker.style.height = '1px';
    bottomMarker.style.width = '1px';

    element.appendChild(bottomMarker);

    var bottomObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!hasStarted || hasCompleted) return;

        if (entry.isIntersecting) {
          bottomTimer = setTimeout(function () {
            hasCompleted = true;

            var elapsedMs = Date.now() - startedAt;

            pushEvent(classify(elapsedMs), elapsedMs);

            bottomObserver.disconnect();
          }, bottomVisibleRequiredMs);
        } else if (bottomTimer) {
          clearTimeout(bottomTimer);
          bottomTimer = null;
        }
      });
    }, {
      threshold: 1
    });

    bottomObserver.observe(bottomMarker);
  };
})();
