/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      fontSize: {
        base: "0.875rem",   // default 14px instead of 16px
        sm: "0.75rem",      // 12px
        lg: "1rem",         // 16px
      },
      spacing: {
        btnx: "0.75rem",    // custom horizontal padding
        btny: "0.25rem",    // custom vertical padding
      },
       colors: {
        primary: '#2E5F73',
      }
    },
  },
  plugins: [],
}
