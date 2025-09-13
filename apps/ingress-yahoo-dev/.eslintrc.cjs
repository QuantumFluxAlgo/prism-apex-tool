/** Local lint overrides for ingress microservice (dev-only) */
module.exports = {
  root: false,
  env: { node: true, es2022: true },
  rules: {
    // We emit small JSON logs in dev; the main repo logger handles prod.
    "no-console": "off"
  }
};
