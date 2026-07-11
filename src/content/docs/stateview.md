---
title: StateView
description: StateView in Sharpino.
---

# StateView

One role of the `StateView` component is to provide the state of an aggregate using the cache, with the event store as a fallback, leveraging memoization techniques.

There are two ways to get the state of an aggregate:

`getAggregateFreshState` and `getAggregateFreshStateAsync`

Single-node, non-distributed applications typically use the `StateView` to retrieve the state of an aggregate. However, it is also possible to run independent nodes that implement a "StateView as a service"—listening to events on a message bus, rebuilding aggregate states, and providing a fallback mechanism to resynchronize with the event store. Some experimental examples demonstrate this using RabbitMQ.
Generally, we can provide a `StateViewer` object when constructing the application layer, deciding which state viewer implementation to adopt. To use the standard cache+event store state viewer, we can use `getAggregateStorageFreshStateViewer` or `getAggregateStorageFreshStateViewerAsync` from the `CommandHandler` component. These can be called in a curried style, passing the event store to return the required `stateReader` function. Many existing examples use this pattern.

The `StateView` also provides functions to dispatch calls that update the details cache. By managing dependencies, it ensures the details cache is aware of changes to aggregate states and triggers refreshes of dependent details.

A more detailed explanation will come soon. 

