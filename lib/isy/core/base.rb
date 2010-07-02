require 'singleton'

module Isy
  module Core

    def self.generate_id
      UUID.generate(:compact).to_i(16).to_s(36)
    end

    REPLACE_BODY = 'replaceBody'
    SET_CONTEXT = 'setContextId'

    class Base
      
      @containers = {}

      # @return [Container] container by user_id (session id is used)
      def self.container(user_id)
        @containers[user_id] ||= Container.new(user_id)
      end

      # delete container where isn't needed any more
      def self.drop_container(container)
        @containers.delete(container.id)
      end

      # runs websocket server - schedule start after eventmachine startup in thin
      def self.run!
        run_websocket_server
      end

      # @return [Hash] configuration for :websocket
      def self.config
        Config[:websocket]
      end

      @fibers_pool = NeverBlock::Pool::FiberPool.new

      # @return [NeverBlock::Pool::FiberPool]
      def self.fibers_pool
        @fibers_pool
      end

      # tries to execute block safely, errors are logged
      # @yield block to safe execution
      def self.safely(&block)
        begin
          block.call
        rescue Exception => e
          Isy.logger.exception e
        end
      end

      private

      # setups websocket server
      def self.run_websocket_server
        EM.epoll
        EM.schedule do
          EventMachine::start_server config[:host], config[:port], WebSocket::Connection,
              :debug => config[:debug] do |connection|

            connection.onopen do
              Isy.logger.debug "WebSocket connection opened"
            end

            connection.onmessage do |message|
              case message[:command].try(:underscore)
              when 'log' then Isy.logger.send(message[:severity], "Browser: " + message[:message])
              when 'get_context' then
                context = Base.container(message[:session_id]).context
                context.schedule { context.send_id!(connection).actualize! }
              when 'execute_action' then
                context = Base.container(message[:session_id]).context(message[:context_id])
                context.schedule { context.run_action(message[:action_id]).actualize! } 
              else Isy.logger.info "Unknown action #{message[:command]}"
              end
            end

            connection.onclose do
              Isy.logger.debug "WebSocket connection closed"
              safely do
                Context.by_connection(connection).drop
              end
            end
          end
          
          Isy.logger.info '== Isy WebSocket running.'
        end
      end

    end
  end
end