import { useCallback, useEffect, useState } from "react";
import { NewPost, Posts } from "../types.ts";
import attempt from "../utilities/attempt.ts";
import axios from "axios";
import PostStore from "../components/PostStore.tsx";
import PostList from "../components/PostList.tsx";

function PostsPage() {
  const [posts, setPosts] = useState<Posts>({});

  const listPosts = useCallback(async () => {
    const [error, response] = await attempt(() => axios.get("http://localhost:4005/posts"));
    if (!error) {
      return response.data;
    }
  }, []);

  async function storePost(post: NewPost) {
    const [error, response] = await attempt(async () =>
      axios.post("http://localhost:4005/posts", post)
    );
    if (!error) {
      setPosts((current) => ({ ...current, [response.data.id]: response.data }));
    }
  }

  useEffect(() => {
    listPosts().then((posts: Posts) => {
      if (posts) setPosts(posts);
    });
  }, [listPosts]);

  return (
    <>
      <PostStore store={storePost} />
      <hr />
      <h1>Posts</h1>
      <PostList posts={posts} />
    </>
  );
}

export default PostsPage;
