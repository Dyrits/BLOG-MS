import { useRef } from "react";

import attempt from "../utilities/attempt.ts";

type Properties = {
  store: (content: string) => Promise<void>;
}

function CommentStore( { store }: Properties ) {
  const content = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [error] = await attempt(() => store(content.current!.value));
    if (!error) {
      content.current!.value = String();
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div className="form-floating my-4">
            <input ref={content} type="text" className="form-control" id="comment" />
            <label htmlFor="comment">Comment</label>
          </div>
          <button className="btn btn-primary">Submit</button>
        </div>
      </form>
    </div>
  );

}

export default CommentStore;