/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useState } from 'react';
import { USER_ID } from './api/todos';
import { Todo } from './types/Todo';
import * as postService from './api/todos';
import classNames from 'classnames';
import { ToDoForm } from './components/ToDoForm';

export const App: React.FC = () => {
  // #region loadToDOs
  const [todos, setToDos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingTodoId, setLoadingTodoId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<'active' | 'all' | 'completed'>('all');
  const [tempToDo, setTempToDo] = useState<Todo | null>(null);

  const loadToDos = () => {
    setLoading(true);

    postService
      .getTodos(USER_ID)
      .then(setToDos)
      .catch(() => setErrorMessage('Unable to load todos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadToDos();

    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(''); // Clear the error message after 3 seconds
      }, 3000);

      return () => clearTimeout(timer); // Cleanup the timer if the component unmounts or errorMessage changes
    }
  }, [USER_ID, errorMessage]);

  const filteredToDos = todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }

    if (filter === 'completed') {
      return todo.completed;
    }

    return true;
  });

  // #endregion
  // #region add, delete
  const addToDo = async (newTodo: Todo) => {
    setErrorMessage('');
    setTempToDo({
      id: 0,
      title: newTodo.title,
      completed: newTodo.completed,
      userId: newTodo.userId,
    });

    try {
      const createdTodo = await postService.createTodo({
        title: newTodo.title,
        completed: newTodo.completed,
        userId: newTodo.userId,
      });

      setToDos(currentTodos => [...currentTodos, createdTodo]); // Add the created todo to the list
      setTempToDo(null); // Clear the temporary todo
    } catch (error) {
      setErrorMessage('Unable to add a todo');
      setTempToDo(null);
      throw error;
    }
  };

  const deleteToDo = (todoId: number) => {
    setErrorMessage('');
    setLoadingTodoId(todoId);
    setToDos(currentTodos => currentTodos.filter(todo => todo.id !== todoId));

    postService
      .deleteTodo(todoId)
      .catch(() => {
        setErrorMessage('Unable to delete a todo');
        loadToDos(); // Reload todos in case of failure
      })
      .finally(() => {
        setLoadingTodoId(null);
      });
  };

  const updateTodo = async (todoId: number, updatedFields: Partial<Todo>) => {
    setLoadingTodoId(todoId); // Set the loading state for the todo being updated

    // Optimistically update the UI
    try {
      const todoToUpdate = todos.find(todo => todo.id === todoId);

      if (!todoToUpdate) {
        setErrorMessage('Todo not found');

        return;
      }

      // Send the update request to the server
      const updatedTodo = await postService.updateTodo({
        ...todoToUpdate,
        ...updatedFields,
      });

      // Update the todos state only after the server responds
      setToDos(currentTodos =>
        currentTodos.map(todo => (todo.id === todoId ? updatedTodo : todo)),
      );
    } catch {
      setErrorMessage('Unable to update todo status');
      loadToDos(); // Reload todos in case of failure
    } finally {
      setLoadingTodoId(null); // Clear the loading state
    }
  };

  // #endregion

  if (!USER_ID) {
    setErrorMessage('User ID is not defined');

    return;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className={classNames('todoapp__toggle-all', {
              active: todos.length > 0 && todos.every(todo => todo.completed),
            })}
            data-cy="ToggleAllButton"
          />

          {/* Add a todo on form submit */}
          <ToDoForm onSubmit={addToDo} onError={setErrorMessage} />
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {/* Render regular todos */}
          {filteredToDos.map(todo => (
            <div
              key={todo.id}
              data-cy="Todo"
              className={classNames('todo', { completed: todo.completed })}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() =>
                    updateTodo(todo.id, { completed: !todo.completed })
                  }
                />
              </label>

              <span data-cy="TodoTitle" className="todo__title">
                {todo.title}
              </span>

              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
                onClick={() => deleteToDo(todo.id)}
              >
                ×
              </button>

              <div
                data-cy="TodoLoader"
                className={classNames('modal overlay', {
                  'is-active': loadingTodoId === todo.id,
                })}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}

          {/* Show tempTodo with a loader */}
          {tempToDo && (
            <div data-cy="Todo" className="todo">
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={tempToDo.completed}
                  disabled
                />
              </label>

              <span data-cy="TodoTitle" className="todo__title">
                {tempToDo.title}
              </span>

              <div data-cy="TodoLoader" className="modal overlay is-active">
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          )}
        </section>

        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {`${todos.filter(todo => !todo.completed).length} items left`}
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: filter === 'all',
                })}
                data-cy="FilterLinkAll"
                onClick={() => setFilter('all')}
              >
                All
              </a>

              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: filter === 'active',
                })}
                data-cy="FilterLinkActive"
                onClick={() => setFilter('active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: filter === 'completed',
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter('completed')}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              onClick={() =>
                setToDos(currentTodos =>
                  currentTodos.filter(todo => !todo.completed),
                )
              }
              disabled={todos.every(todo => !todo.completed)}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* Error notification */}
      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !errorMessage },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {errorMessage}
      </div>
    </div>
  );
};
