import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '../components/NotFound';

describe('NotFound Component', () => {
  test('отображает страницу 404 с правильным сообщением и кнопкой возврата', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );
    });
    
    // Проверяем заголовок 404
    expect(screen.getByText('404')).toBeInTheDocument();
    
    // Проверяем сообщение об ошибке
    expect(screen.getByText('Страница не найдена')).toBeInTheDocument();
    expect(screen.getByText('Извините, запрашиваемая страница не существует.')).toBeInTheDocument();
    
    // Проверяем наличие кнопки возврата на главную
    const button = screen.getByText('Вернуться на главную');
    expect(button).toBeInTheDocument();
    
    // Проверяем, что кнопка имеет ссылку на главную страницу
    const link = button.closest('a');
    expect(link).toHaveAttribute('href', '/');
  });
}); 