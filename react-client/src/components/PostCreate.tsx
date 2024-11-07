import { FormEvent, useRef } from "react";

import attempt from "../utilities/attempt.ts";
import { NewPost } from "../types.ts";

type Properties = {
  create: (post: NewPost) => Promise<void>;
}

function PostCreate({ create }: Properties) {
  const title = useRef<HTMLInputElement>(null);
  const content = useRef<HTMLTextAreaElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [error] = await attempt(() =>
      create({ title: title.current!.value, content: content.current!.value })
    );
    if (!error) {
      title.current!.value = String();
      content.current!.value = String();
    }
  }

  return (
    <div>
      <h2>Create a post</h2>
      <form onSubmit={submit}>
        <div className="form-group">
          <div className="form-floating my-4">
            <input ref={title} type="text" className="form-control" id="title" />
            <label htmlFor="title">Title</label>
          </div>
          <div className="form-floating my-4">
            <textarea ref={content} className="form-control" id="content" />
            <label htmlFor="content" className="form-label">Content</label>
          </div>
          <button className="btn btn-primary">Submit</button>
        </div>
      </form>
    </div>
  );
};

export default PostCreate;