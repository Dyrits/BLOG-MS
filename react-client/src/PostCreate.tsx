import { FormEvent, useRef } from "react";
import axios from "axios";

function PostCreate() {
  const title = useRef<HTMLInputElement>(null);
  const content = useRef<HTMLTextAreaElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await axios.post("http://localhost:4005/posts", {
        title: title.current!.value, content: content.current!.value
      });
    } catch (error) {
      console.error(error);
    } finally {
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