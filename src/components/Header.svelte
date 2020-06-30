<script>
  import Button from './Button.svelte';
  import URLShortener from './URLShortener.svelte';
  
  
  // TODO: implement these handlers
  function handleResetSearchClick() { console.log('resetting search...'); }
  function handleStatsLinkClick() { console.log('stats link clicked...'); }

  let dateString = 'TODO time';
</script>

<header class="global-header">
	<h1><a class="global-header--main-heading" href="/">Probe Dictionary</a></h1>
	<nav>
		<ul class="global-navigation">
			<li>
        <Button
          handleClick={handleResetSearchClick}
          classes={['nav-icon', 'nav-reset-search']}
          variants={['plain']}
          label="reset search"
        >
          reset search
        </Button>
      </li>
			<li>
        <Button
          handleClick={handleStatsLinkClick}
          classes={['nav-icon', 'nav-stats']}
          variants={['plain']}
        >
          stats
        </Button>
      </li>
			<li>
				<Button 
          link={{href: 'https://github.com/mozilla/probe-dictionary/issues/new', newTab: true}}
          classes={['nav-icon', 'nav-file-bug']}
          variants={['plain']}
        >
          file a bug
        </Button>
			</li>
			<li>
				<Button
          link={{href: 'https://telemetry.mozilla.org/', newTab: true}}
          classes={['nav-icon', 'nav-telemetry']}
          variants={['plain']}
        >
          telemetry portal
        </Button>
			</li>
			<li>
				<URLShortener />
			</li>
		</ul>
	</nav>
  <dl class="global--last-updated">
    <dt>updated</dt>
    <dd>{dateString}</dd>
  </dl>
</header>

<style>
	.global--last-updated {
    position: relative;
    color: var(--subtle-text-color);
  }
  .global--last-updated dt {
    font-size: var(--text-size-minor-label);
    font-weight: 500;
    position: absolute;
    top: -20px;
  }
  .global--last-updated dd {
    font-size: var(--text-size-minor-value);
    font-weight: 600;
  }
</style>