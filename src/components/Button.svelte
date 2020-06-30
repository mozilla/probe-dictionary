<script>
  export let classes;
  export let handleClick;
  export let link;
  export let variants;

  let classNames = 'btn';

  $: if (variants) {
    variants.forEach(variant => {
      classNames += ` btn-variant-${variant} `;
    });
  }
  $: classNames += classes && classes.length ? classes.join(' ') : '';
</script>

{#if link && link.newTab}
  <a class={classNames} href={link.href} rel="noopener noreferrer" target="_blank"><slot /></a>
{:else if link}
  <a class={classNames} href={link.href}><slot /></a>
{:else}
  <button class={classNames} on:click={handleClick}><slot /></button>
{/if}

<style>
  .btn {
    font-size: var(--btn-font-size-medium);
    cursor: pointer;
    font-weight: 600;
    padding: var(--btn-padding-medium);
    display: inline-block;
  }
  .btn.nav-icon {
    padding-left: 20px;
    background-size: 14px 14px;
    background-position: 0 center;
  }
  .btn.nav-file-bug {
    background-position: 0 12px;
  }
  .btn-variant-plain {
    border: 0;
    background-color: transparent;
    color: var(--primary-link-color);
    margin: 0;
    padding-left: 0;
    padding-right: 0;
  }
  .btn-variant-plain:hover {
    border-bottom: 0.5px solid var(--primary-link-color);
  }
</style>