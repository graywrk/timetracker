#!/usr/bin/env python

import requests
import json
import sys
from datetime import datetime, timedelta
import os

# Настройки API
API_BASE_URL = "http://localhost:8000"

# Токен, полученный при регистрации
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo2LCJleHAiOjE3NDE5NjI0MjV9.NvmJjOM8WEvDmEypjglzPxUp6Se0jzh37aaqKglfOyM"

def check_time_status(token):
    """Проверяет статус времени"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/time/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Статус времени: {json.dumps(data, indent=2, ensure_ascii=False)}")
            return data
        else:
            print(f"❌ Ошибка при получении статуса времени: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Исключение при проверке статуса: {str(e)}")
        return None

def check_stats(token, start_date=None, end_date=None):
    """Проверяет статистику за указанный период"""
    # Если даты не указаны, используем текущий месяц
    if not start_date:
        today = datetime.now()
        start_date = datetime(today.year, today.month, 1).strftime("%Y-%m-%d")
        
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"📊 Запрос статистики за период: {start_date} - {end_date}")
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/stats/custom",
            params={"start_date": start_date, "end_date": end_date},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"📤 Запрос отправлен на: {response.url}")
        print(f"📥 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Статистика получена: {json.dumps(data, indent=2, ensure_ascii=False)}")
                
                # Подробный анализ статистики
                print("\n📋 Анализ статистики:")
                print(f"- Общая продолжительность: {data.get('total_duration', 'Отсутствует')} (тип: {type(data.get('total_duration')).__name__})")
                print(f"- Среднее время в день: {data.get('average_daily_hours', 'Отсутствует')} (тип: {type(data.get('average_daily_hours')).__name__})")
                print(f"- Самая длинная сессия: {data.get('longest_session', 'Отсутствует')} (тип: {type(data.get('longest_session')).__name__})")
                
                # Преобразуем для проверки
                if 'total_duration' in data and data['total_duration'] is not None:
                    total_seconds = float(data['total_duration'])
                    hours = total_seconds // 3600
                    minutes = (total_seconds % 3600) // 60
                    seconds = total_seconds % 60
                    print(f"- Общая продолжительность (преобразованная): {int(hours)} ч. {int(minutes)} мин. {int(seconds)} сек.")
                
                # Проверка ежедневной статистики
                daily_stats = data.get('daily_stats', {})
                print(f"- Ежедневная статистика: {len(daily_stats)} дней")
                for date, duration in list(daily_stats.items())[:3]:  # показываем только первые 3 дня
                    print(f"  * {date}: {duration} (тип: {type(duration).__name__})")
                    
                    # Преобразуем для проверки
                    dur_seconds = float(duration) if isinstance(duration, (int, float, str)) else 0
                    dur_hours = dur_seconds // 3600
                    dur_minutes = (dur_seconds % 3600) // 60
                    dur_seconds = dur_seconds % 60
                    print(f"    Преобразованная длительность: {int(dur_hours)} ч. {int(dur_minutes)} мин. {int(dur_seconds)} сек.")
                
                # Проверка записей
                entries = data.get('entries', [])
                print(f"- Записи: {len(entries)}")
                for i, entry in enumerate(entries[:3]):  # показываем только первые 3 записи
                    status = entry.get('status', 'неизвестно')
                    start = entry.get('start_time', 'не указано')
                    end = entry.get('end_time') or 'не завершено'
                    total_paused = entry.get('total_paused', 0)
                    
                    # Рассчитываем продолжительность записи для проверки
                    if entry.get('end_time'):
                        start_time = datetime.fromisoformat(start.replace('Z', '+00:00'))
                        end_time = datetime.fromisoformat(end.replace('Z', '+00:00'))
                        duration_seconds = (end_time - start_time).total_seconds() - float(total_paused)
                        hours = duration_seconds // 3600
                        minutes = (duration_seconds % 3600) // 60
                        seconds = duration_seconds % 60
                        duration_str = f"{int(hours)} ч. {int(minutes)} мин. {int(seconds)} сек."
                    else:
                        duration_str = "активная сессия"
                    
                    print(f"  * Запись {i+1}: статус={status}, начало={start}, окончание={end}")
                    print(f"    Длительность: {duration_str}, Пауза: {total_paused} сек.")
                
                return data
            except json.JSONDecodeError:
                print(f"❌ Ошибка декодирования JSON: {response.text[:200]}")
                return None
        else:
            print(f"❌ Ошибка при получении статистики: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Исключение при получении статистики: {str(e)}")
        return None

def main():
    """Основная функция"""
    print("🚀 Начало проверки статистики с использованием существующего токена...")
    
    # Проверяем статус времени
    time_status = check_time_status(TOKEN)
    
    # Проверяем статистику за текущий месяц
    current_month_stats = check_stats(TOKEN)
    
    # Проверяем статистику за последний год
    one_year_ago = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    today = datetime.now().strftime("%Y-%m-%d")
    yearly_stats = check_stats(TOKEN, one_year_ago, today)
    
    print("\n✨ Проверка завершена")

if __name__ == "__main__":
    main() 