# Caching

## Data Freshness

All data in the REST API is cached for a period of one minute, and is not meant to be polled in order to keep your data fresh.\
\
If realtime data is part of your use-case, you will want to use the REST API in conjunction with the GraphQL Realtime API for a constant feed of updated data.
