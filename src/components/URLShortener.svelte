<script>
  import Button from './Button.svelte';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';


  let active = false;
  let shortURL = '';

  async function handleShortLinkClick() {
    const url = 'https://api-ssl.bitly.com/v3/shorten?';
    // To test this locally either edit your local hosts file or
    // replace window.location.href with any url string.
    const params = `longUrl=${encodeURIComponent(window.location.href)}&access_token=48ecf90304d70f30729abe82dfea1dd8a11c4584&format=json`;

    const response = await fetch(url + params);
    if (response.status !== 200) {
      console.error(`Bitly API response error. Status Code: ${response.status}`);
      return;
    }

    const { data } = await response.json();
    if (data.url) {
      shortURL = data.url;
      active = true;
    }
  }

  function handleCopy() {
    const copyText = document.getElementById('url-shortener--input');
    copyText.select();
    document.execCommand('copy');
  }
</script>


<div class="url-shortener">
  {#if !active}
    <Button
      handleClick={handleShortLinkClick}
      classes={['nav-icon', 'nav-shorten']}
      variants={['plain']}
    >
      get short link
    </Button>
  {/if}
      
  {#if active}
    <div class="url-shortener--details" in:scale="{{duration: 300, opacity: 0.6, start: 0.6, easing: cubicOut }}">
      <input type="text" id="url-shortener--input" value={shortURL} />
      <button class="url-shortener--copy-btn" on:click={handleCopy}>
        copy
      </button>
    </div>
  {/if}
</div>

<style>
  .url-shortener--details {
    height: var(--form-field-height-medium);
    position: relative;
    top: 5px;
  }
  .url-shortener--details,
  #url-shortener--input {
    width: var(--form-field-width-small);
  }
  #url-shortener--input {
    padding-right: calc(var(--space-scale-01) + var(--form-field-height-medium));
  }
  .url-shortener--copy-btn {
    height: var(--form-field-height-medium);
    border: 1px solid var(--primary-link-color);
    border-radius: var(--border-radius-02);
    background: transparent url('/img/icons/copy.svg') no-repeat center;
    background-size: calc(var(--form-field-height-medium) - 12px) calc(var(--form-field-height-medium) - 12px);
    width: var(--form-field-height-medium);
    text-indent: -200vw;
    position: absolute;
    right: 0;
    box-shadow: -1px 0 3px rgba(0, 0, 0, 0.2);
    color: var(--primary-link-color);
    cursor: pointer;
  }
</style>