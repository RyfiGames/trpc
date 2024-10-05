import { TRPCClientError, TRPCLink } from "@trpc/client"
import { AnyRouter, inferRouterError } from "@trpc/server"
import { observable } from "@trpc/server/observable"
import { TRPCResponse, TRPCResponseMessage } from "@trpc/server/rpc"
import { isObject } from "util"

type JsonLinkOptions = {
  send: (msg: unknown) => Promise<unknown>,
}

export function jsonLink<TRouter extends AnyRouter = AnyRouter>(
  opts: JsonLinkOptions
): TRPCLink<TRouter> {
  return () => {
    return ({ op }) => {
      return observable((observer) => {
        opts.send(op).then((value) => {
          const transformed = transformResponse(value);
          if (!transformed.ok) {
            observer.error(
                TRPCClientError.from(transformed.error, {
                  meta: value as any,
                }),
              );
              return;
          }
          observer.next({
            context: undefined,
            result: transformed.result
          });
          observer.complete()
        })
        return () => { }
      });
    }
  }
}

function transformResponse(response: any) {
  if ('error' in response) {
    const error = response.error
    return {
      ok: false,
      error: {
        ...response,
        error,
      },
    } as const;
  }

  const result = {
    ...response.result,
    ...((!response.result.type || response.result.type === 'data') && {
      type: 'data',
      data: response.result.data,
    }),
  }
  return { ok: true, result } as const;
}