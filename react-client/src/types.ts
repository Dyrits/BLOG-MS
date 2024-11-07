export interface Post {
  id: string;
  title: string;
  content: string;
}

export interface NewPost extends Omit<Post, "id"> {}

export interface Posts {
  [id: string]: Post;
}

export interface Comment {
  id: string;
  post$id: string;
  content: string;
}

export interface NewComment extends Omit<Comment, "id"> {}