<script>
  export let label;
  export let handleChange;
  export let checked;
</script>

<label class="pretty-checkbox ">
  <input type="checkbox" on:input={handleChange} {checked}>
  <span class="custom-checkbox"></span>
  <span class="text-label">{label}</span>
</label>
