import Splide from '@splidejs/splide';

$(function() {
	// OSで「視差効果を減らす」を設定している場合は、jQueryのアニメーション（slideDown等）をすべて無効にする
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		$.fx.off = true;
	}

	// ハンバーガーメニュー
	const $html = $('html');
	const $menuBtn = $('.js-header__menu-btn');
	const $gnav = $('.js-header__gnav');
	const pcQuery = window.matchMedia('(min-width: 769px)'); // $mq-breakpoints の md

	const isMenuOpen = () => $menuBtn.hasClass('is-open');

	const openMenu = () => {
		$menuBtn.addClass('is-open').attr('aria-expanded', true);
		$html.addClass('is-menu-open');
		$gnav.stop().slideDown(300);
	};

	const closeMenu = () => {
		$menuBtn.removeClass('is-open').attr('aria-expanded', false);
		$html.removeClass('is-menu-open');
		$gnav.stop().slideUp(300);
	};

	$menuBtn.on('click', function() {
		if (isMenuOpen()) {
			closeMenu();
		} else {
			openMenu();
		}
	});

	// メニュー内のリンクを押したら閉じる（ページ内リンクで移動できるよう、先にスクロールの固定を外す）
	$gnav.on('click', 'a', function() {
		if (isMenuOpen()) {
			closeMenu();
		}
	});

	// Escキーで閉じる
	$(document).on('keydown', function(e) {
		if (e.key === 'Escape' && isMenuOpen()) {
			closeMenu();
			$menuBtn.trigger('focus');
		}
	});

	// 768px以上に広がったら、開閉状態をリセットしてCSSの表示に戻す
	$(pcQuery).on('change', function() {
		if (pcQuery.matches) {
			$menuBtn.removeClass('is-open').attr('aria-expanded', false);
			$html.removeClass('is-menu-open');
			$gnav.stop(true, true).removeAttr('style');
		}
	});

	// メインビジュアルスライダー
	if( $('.splide').length) {
		new Splide( '.splide', {
			type: 'loop',
			autoplay: true,
			// 「視差効果を減らす」設定時は、自動再生を止めてスライドを瞬時に切り替える（Splideの初期値と同じだが明示しておく）
			reducedMotion: {
				speed: 0,
				rewindSpeed: 0,
				autoplay: 'pause',
			},
		}).mount();
	}

	// タブ
	$('.js-tabs').each(function() {
		const $tabs = $(this).find('[role="tab"]');
		const $panels = $(this).find('[role="tabpanel"]');

		const selectTab = ($tab) => {
			$tabs.attr({ 'aria-selected': 'false', tabindex: '-1' });
			$tab.attr({ 'aria-selected': 'true', tabindex: '0' });
			$panels.prop('hidden', true);
			$('#' + $tab.attr('aria-controls')).prop('hidden', false);
		};

		$tabs.on('click', function() {
			selectTab($(this));
		});

		// 左右キーでタブを移動
		$tabs.on('keydown', function(e) {
			const index = $tabs.index(this);
			let nextIndex;
			if (e.key === 'ArrowRight') {
				nextIndex = (index + 1) % $tabs.length;
			} else if (e.key === 'ArrowLeft') {
				nextIndex = (index - 1 + $tabs.length) % $tabs.length;
			} else {
				return;
			}
			e.preventDefault();
			const $next = $tabs.eq(nextIndex);
			selectTab($next);
			$next.trigger('focus');
		});
	});

	// アコーディオン
	$('.js-accordion').each(function() {
		const $details = $(this);
		const $content = $details.find('.js-accordion-content');

		$details.toggleClass('is-open', $details.prop('open'));

		$details.children('summary').on('click', function(e) {
			e.preventDefault();
			if ($details.hasClass('is-open')) {
				$details.removeClass('is-open');
				$content.stop().slideUp(300, () => {
					$details.prop('open', false);
				});
			} else {
				if (!$details.prop('open')) {
					$content.hide();
				}
				$details.prop('open', true).addClass('is-open');
				$content.stop().slideDown(300);
			}
		});

		// ページ内検索などでブラウザが直接開いた場合
		$details.on('toggle', function() {
			if ($details.prop('open') && !$details.hasClass('is-open')) {
				$details.addClass('is-open');
				$content.stop().show();
			}
		});
	});
})
